let secureEnv = require('secure-env');
let throng = require('throng');
let Queue = require("bull");
const imageToBase64 = require('image-to-base64');
global.env = secureEnv({secret:'sfcmsmc'});

// Get the libraries.
let https = require('https');
let querystring = require('querystring');
let request = require('request');
let fs = require('fs'); 
let Html5Entities = require('html-entities').Html5Entities;


function getMCAuthToken(callback){
  request.post(global.env.MC_TOKEN_ENDPOINT , {
    json: {
      "grant_type": "client_credentials",
      "client_id": global.env.MC_CLIENTID ,
      "client_secret": global.env.MC_CLIENTSECRET
      }
    }, function (error, response, body) {    
      console.error('error:', error); // Print the error if one occurred
      console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
      console.log('body:', body); // Print the HTML for the Google homepage.
      callback(body.access_token);
  });
  
}

function getCMSAccessToken(callback){
    request.post(global.env.CMS_HOST +  global.env.CMS_TOKEN_ENDPOINT, {
        form: {
          "grant_type": "password",
          "client_id": global.env.CMS_CLIENTID ,
          "client_secret": global.env.CMS_CLIENTSECRETID ,
          "username": global.env.CMS_USERNAME,
          "password": global.env.CMS_PASS,
          "format": "json"
          }
        }, function (error, response, body) {    
          console.error('error:', error); // Print the error if one occurred
          console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
          console.log('body:', body); // Print the HTML for the Google homepage.
          callback(JSON.parse(body).access_token);
      });
    
}




// Connect to a local redis intance locally, and the Heroku-provided URL in production
let REDIS_URL = global.env.REDIS_URL || "redis://127.0.0.1:6379";


// Spin up multiple processes to handle jobs to take advantage of more CPU cores
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
let workers = global.env.WEB_CONCURRENCY || 2;

// The maxium number of jobs each worker should process at once. This will need
// to be tuned for your application. If each job is mostly waiting on network 
// responses it can be much higher. If each job is CPU-intensive, it might need
// to be much lower.
let maxJobsPerWorker = 50;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


function getSalesforceCMSContent(contentType, callback){

  getCMSAccessToken(function(cms_access_token){
    console.log(cms_access_token)
    let path= global.env.CMS_DELIVERY_API_BASEPATH + global.env.CHANNEL_ID + global.env.CMS_API_CHANNEL_END_POINT +
    '?managedContentType=' + contentType + '&page=0&pageSize=5';
    let url = global.env.CMS_API_DOMAINPATH + path;
    console.log(url);
    request.get(url, {
      headers: {
        'Authorization': 'Bearer ' + cms_access_token
      }
      }, function (error, response, body) {   
        console.error('error:', error); 
        console.log('statusCode:', response && response.statusCode); 
        console.log('body:', body); 
        let bodyJSON = JSON.parse(body);
        callback(bodyJSON.items, cms_access_token);
    });
  })

  

}

function downloadBase64FromURL(url, callback){
  https.get(url, (resp) => {
    resp.setEncoding('base64');
    imageBody = "";//"data:" + resp.headers["content-type"] + ";base64,";
    resp.on('data', (data) => { imageBody += data});
    resp.on('end', () => {
        console.log(imageBody);
        callback(imageBody);
    });
  }).on('error', (e) => {
      console.log(`Got error: ${e.message}`);
  });  
}

function processCMSContentForMC(job, nodeList, callback, sf_cms_access_token){
  console.log('Processing Images for MC:' +  nodeList.length);
  getMCAuthToken(function(mc_access_token){
    console.log('Got MC Access token'+mc_access_token);
    nodeList.forEach(async(nodeListItem) => { 
      console.log(nodeListItem.type);
       if(nodeListItem.type == global.env.CONTENT_TYPE){
        let htmlblockAssetBody = {
          name: nodeListItem.title,
          assetType: {
            "id": global.env.MC_ASSET_TYPE_HTML_BLOCK_ID
          },
          content: Html5Entities.decode(nodeListItem.contentNodes.emailbody.value),
          "subjectline": {},
          category: {
            id: global.env.MC_ASSET_FOLDER_ID
          }
        };
        createMCAsset(mc_access_token, htmlblockAssetBody, function(){
        });
      } 
    }); 
  });
}


function createMCAsset(access_token, assetBody, callback){
  console.log(assetBody);
  request.post(global.env.MC_HOST + global.env.MC_ASSETS_API_PATH, {
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    json: assetBody
  }, (error, res, body) => {
    if (error) {
      console.error(error);
    }else {
      console.log(`statusCode: ${res.statusCode}`)
      console.log(body);
    }
    callback();
  });  
}


function start() {
  // Connect to the named work queue
  let workQueue = new Queue('work', REDIS_URL);

  workQueue.process(maxJobsPerWorker, async (job, done) => {
    let progress = 0;
    console.log(job.data.data.contentId);
    
    //Not a right thing to do, but just for demo.
    global.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

    job.progress(5);
  

    getSalesforceCMSContent(global.env.CONTENT_TYPE, function(contentItems,cms_access_token){
      job.progress(20);
      console.log(contentItems);
      processCMSContentForMC(job, contentItems, done,cms_access_token);
    });
  return;
    getSalesforceCMSContent('rte_email', function(contentItems){
      job.progress(20);
      console.log(contentItems);
      processCMSContentForMC(job, contentItems, done);
    });
  
    // A job can return values that will be stored in Redis as JSON
    // This return value is unused in this demo application.
   
  });
}

// Initialize the clustered worker process
// See: https://devcenter.heroku.com/articles/node-concurrency for more info
throng({ workers, start });
