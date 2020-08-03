# Sample App Custom Data Transfer service (Salesforce CMS to Marketing cloud content ) 

*This code is sample app to achieve the integration between Salesforce CMS and Marketing cloud. Please don't consider it as an official tool


This is a node js server with worker does following things.

1. Pull data from CMS via OAuth and CMS API
2. Copy and Push content to Marketing cloud Content builder 
3. Cron job that keeps both the content in Sync

# Salesforce CMS credentials

In Salesforce, Create a connected app and enter the crendentials in **`.env`** file as below

create ".env" file with following values updated.

CMS_HOST=https://login.salesforce.com/ \
CMS_TOKEN_ENDPOINT=/services/oauth2/token \
CREATE_CONTENTTYPE_ENDPOUNT = /services/data/v49.0/tooling/sobjects/ManagedContentType/ \
CMS_CLIENTID=<clientid> \
CMS_CLIENTSECRETID=<secret> \
CMS_USERNAME=<username> \
CMS_PASS=<passwd+token> \
CMS_API_DOMAINPATH=<Custom domain salesforce url> \
CMS_API_BASEPATH=/services/data/v49.0/connect/communities/ \
CMS_ASSET_BASEPATH=<community url with out /s/> \
COMMUNITY_ID=<communityid> \
CONTENT_ID=<contentid>\ 

#Channel API
CMS_DELIVERY_API_BASEPATH=/services/data/v49.0/connect/cms/delivery/channels/\
CHANNEL_ID=<Chanel ID copied from workbench via channels api>\
CMS_API_CHANNEL_END_POINT=/contents/query\
CMS_API_ASSET_PATH=/services/data/v49.0/connect\
CONTENT_TYPE=<devname of custom content typpe>


# Marketing Cloud Credentails

Create an app in marketing cloud and then enable API integration.

MC_TOKEN_ENDPOINT=<marketing cloud token end point>\
MC_HOST=<marketing cloud API end point>\
MC_CLIENTID=<client id>\
MC_CLIENTSECRET=<client secret>\
MC_ASSETS_API_PATH=<Asset path>\
MC_ASSET_TYPE_IMAGE_ID=<Asset Type ID, available in the Marketing cloud api reference>\
https://developer.salesforce.com/docs/atlas.en-us.noversion.mc-apis.meta/mc-apis/base-asset-types.htm?search_text=img \
MC_ASSET_FOLDER_ID=<Folderid created in content builder to store cms assets>

Use the secure **`.env`** npm module  and encrypt the  **`.env`** file and delete it
Reference: https://www.npmjs.com/package/secure-env

## Installing Local Dependencies

- [Redis](https://redis.io/)

```
$ brew install redis
$ brew services start redis
```

## Getting Started

1. `npm install`
2. `npm start`
3. [http://localhost:5000](http://localhost:5000)

## Deploying

```
$ git clone git@github.com:heroku-examples/node-workers-example.git
$ cd node-workers-example

$ heroku create
$ heroku addons:create heroku-redis
$ git push heroku master
$ heroku ps:scale worker=1
$ heroku open
```

## Application Overview

The application is comprised of two process: 

- **`web`** - An [Express](https://expressjs.com/) server that serves the frontend assets, accepts new background jobs, and reports on the status us existing jobs
- **`worker`** - A small node process that listens for and executes incoming jobs

Because these are separate processes, they can be scaled independently based on specific application needs. Read the [Process Model](https://devcenter.heroku.com/articles/process-model) article for a more in-depth understanding of Heroku’s process model.

The `web` process serves the `index.html` and `client.js` files which implement a simplified example of a frontend interface that kicks off new jobs and checks in on them.
