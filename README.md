[![Build Status](https://travis-ci.org/raymondsze/AMsPp9UVIEytxfPvbrfGOg-T1TcmeIKyUaNDXGmYFX2gA-QQl7PQmSYEKpWHI6tV3fow-8BnFHmwIm0SE7_ck1vw8xQ-8YVxcELx.svg)](https://travis-ci.org/raymondsze/AMsPp9UVIEytxfPvbrfGOg-T1TcmeIKyUaNDXGmYFX2gA-QQl7PQmSYEKpWHI6tV3fow-8BnFHmwIm0SE7_ck1vw8xQ-8YVxcELx.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/raymondsze/AMsPp9UVIEytxfPvbrfGOg-T1TcmeIKyUaNDXGmYFX2gA-QQl7PQmSYEKpWHI6tV3fow-8BnFHmwIm0SE7_ck1vw8xQ-8YVxcELx/badge.svg?branch=master)](https://coveralls.io/r/raymondsze/AMsPp9UVIEytxfPvbrfGOg-T1TcmeIKyUaNDXGmYFX2gA-QQl7PQmSYEKpWHI6tV3fow-8BnFHmwIm0SE7_ck1vw8xQ-8YVxcELx?branch=master)
  
## Logic
<img src="http://image.lxway.com/upload/9/3e/93e1a6ee4c096e918fdeaac3939300f9.png"/>  
#### Producer
The <b>producer</b> is used to put the following payload into beanstalkd tube.  
```javascript
{
	from: 'HKD',
	to: 'USD'
	success_count: 0, // optional, default is 0
	failure_count: 0 // optional, default is 0
}
```
<b>success_count</b> and <b>failure_count</b> is not necessary, <b>consumer</b> will treat them as 0 if not set.  

#### Consumer
The <b>consumer</b> is used to reserve the job putted by producer from beanstalkd tube.  
After job is reserved, <b>consumer</b> will create a new <b>scraper</b> to scrape required information and save to mongodb.  

##### If all is well and <b>success\_count</b> + 1 < <b>success\_trials</b>  
1. Put a new job with same payload but with increment of <b>success\_count</b>. \(Since we need to modifiy <b>success\_count</b>, we cannot use release.\)  
2. Delete the current job.  

##### If all is well but <b>success\_count</b> + 1 >= <b>success\_trials</b>  
1. Delete the current job.  

##### If error encounterd but <b>failure\_count</b> + 1 < <b>tolerance</b>  
1. Put a new job with same payload but with increment of <b>failure\_count</b>. (Since we need to modifiy <b>failure\_count</b>, we cannot use release.)  
2. Delete the current job.  

##### If error encounterd but <b>failure\_count</b> + 1 >= <b>tolerance</b>  
1. Bury the job  

#### Scraper
The <b>scraper</b> is used scrape the required information from web.  
If information is incorrect with the payload (query data), error is thrown.  

## How to install
##### 1. git clone https://github.com/raymondsze/AMsPp9UVIEytxfPvbrfGOg-T1TcmeIKyUaNDXGmYFX2gA-QQl7PQmSYEKpWHI6tV3fow-8BnFHmwIm0SE7_ck1vw8xQ-8YVxcELx  
To clone the project to your project folder
##### 2. npm install
To install all required modules and dev modules
##### 3. npm test
100% coverage is acheived. To make sure all codes is well, istanbul is enabled, coverage folder will be generated after this command is run.

## How to use
##### 1. npm run produce  
This command is to put a job with payload specified in <b>config_production</b> of <b> config/index.js </b>  
##### 2. npm run consume
This command is to consume jobs with payload specified in <b>config_production</b> of <b> config/index.js </b>  
To exit, you can press Ctrl-C  

## Configuration
Please take a look to the comments inside <b> config/index.js </b>

## Enhancement and Alternative
##### 1. If job histroy is important, we could use <b>release</b>, we could use <b>mongodb</b> or <b>redis</b> to store the either success_count or failure_count (or both) so that we could keep the same jobId as well as the beanstalkd job histroy.  
##### 2. Use <b>winston</b> logger to replace console.log, we could make use of <b>winston</b> to log on file, and also skip log during <b>npm test</b>.  
##### 3. Make use of latest ES6 and ES7 syntax with <b>babel-core/register</b> (Babel 6) hook.
##### 4. Support passing argument from console in <b>npm produce</b> and <b>npm consume</b> to reduce necessarily to change the config.
