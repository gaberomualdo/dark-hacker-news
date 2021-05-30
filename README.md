# DarkHN

Dark mode for Hacker News.

To use: **replace news.ycombinator.com in the URL with [darkhn.herokuapp.com](https://darkhn.herokuapp.com/).**

## Technologies

The main server is written with Node.js and Express.js with requests to Hacker News written using Axios.

To rewrite the HTML of each page, Cheerio is used, which allows a jQuery-like function to be used on the page's virtual DOM.

The server is deployed using Heroku. At the time of writing, the Heroku dyno is on a free plan and thus will probably take some time to start up and will sleep for a period of time per month.

This mirror of HN does add some latency to each request since it acts as a proxy and takes time to rewrite the response of each request. To improve this I could port this app to a more efficient server like one written in Go or Rust, or consider a better caching system to request.

Users worried about the latency that this app has that want to use dark mode in HN should definitely consider some of the Chrome Extensions and existing web app HN clients that include the dark mode feature.

## Background

I built this in Spring 2020 after reading a couple posts on HN about adding dark mode to the site. I made some finishing touches in Spring 2021 and published it then.