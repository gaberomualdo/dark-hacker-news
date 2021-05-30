const cheerio = require('cheerio');
const express = require('express');
const axios = require('axios');
const path = require('path');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 8080;

const mirrorHostname = 'news.ycombinator.com';
const mirrorProtocol = 'https';

const makeURL = (protocol, hostname, fullPath) => {
  return protocol + '://' + path.join(hostname, fullPath);
};

const mirrorSite = (req, res) => {
  const reqPath = req.originalUrl;
  const mirrorURL = makeURL(mirrorProtocol, mirrorHostname, reqPath);
  console.log("Request sent for " + mirrorURL);

  axios({
    method: 'get',
    url: mirrorURL,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.4044.138 Safari/537.36',
    },
    responseType: 'text',
  })
    .then((response) => {
      res.header('Content-Type', 'text/html; charset=utf-8');

      const responseContentType = response.headers['content-type'];
      const responseData = response.data;
      if (responseContentType.includes('text/html')) {
        const $ = cheerio.load(responseData);

        // replace static resources with mirror URLs
        $('link[href]').each((ind, linkElm) => {
          $(linkElm).attr('href', makeURL(mirrorProtocol, mirrorHostname, $(linkElm).attr('href')));
        });
        $('script[src], img[src]').each((ind, scriptElm) => {
          $(scriptElm).attr('src', makeURL(mirrorProtocol, mirrorHostname, $(scriptElm).attr('src')));
        });

        // replace incorrect static URLs
        $('a[href^="http://' + mirrorHostname + '"], a[href^="https://' + mirrorHostname + '"]').each((ind, elm) => {
          const elmHrefURL = new URL($(elm).attr('href'));

          // remove hostname from URL
          const newElmHrefURL = elmHrefURL.pathname + elmHrefURL.search;

          $(elm).attr('href', newElmHrefURL);
        });

        // add " | Dark" to title
        $('title').text($('title').text() + ' – Dark');

        // remove logged-in functionality (ex: voting, submit, comment, etc.)

        // remove vote links
        $('.votelinks').html(`<center><div class="votearrow"></div></center>`);

        // remove submit button
        const submitButton = $('.pagetop a[href^="submit"], .pagetop a[href^="/submit"]');

        try {
          // remove '|' separator
          submitButton[0].previousSibling.nodeValue = '';

          submitButton.remove();
        } catch (err) {
          console.log(err.message);
        }

        // add dark mode repo to footer
        $('.yclinks').append(" | <a></a>")

        // add link to default site in place of login button
        const loginButton = $('.pagetop a[href^="login"], .pagetop a[href^="/login"]');
        loginButton.attr('href', mirrorURL);
        loginButton.text('default site');

        // add reply on default site button in place of reply button
        $('.reply a').each((ind, replyButton) => {
          $(replyButton).text('reply on default site');
          $(replyButton).attr('target', '_blank');

          let replyURL = $(replyButton).attr('href');
          replyURL = makeURL('https', mirrorHostname, replyURL);
          replyURL = new URL(replyURL);

          // update 'goto' param to current site, not relative URL at mirror site
          replyURL.searchParams.set('goto', makeURL(mirrorProtocol, mirrorHostname, replyURL.searchParams.get('goto')));

          $(replyButton).attr('href', replyURL.href);
        });

        // add comment on default site button instead of comment box
        $('form[action=comment]').each((ind, elm) => {
          // either 'add comment' or 'reply'
          const elmActionName = $(elm).find('input[type=submit]').attr('value');

          const parent = $(elm).parent();
          parent.html(`<a href=${mirrorURL} target='_blank' class='comment-on-default-site'>${elmActionName} on default site</a>`);
          parent.parent().prev().attr('style', 'height: 20px;');
        });

        // remove 'hide' button
        $('a[href^="hide"], a[href^="/hide"]').each((ind, elm) => {
          // remove '|' separator
          elm.nextSibling.nodeValue = '';

          $(elm).remove();
        });

        // remove 'favorite' button
        $('a[href^="fave"], a[href^="/fave"]').each((ind, elm) => {
          // remove '|' separator
          elm.nextSibling.nodeValue = '';

          $(elm).remove();
        });

        // fix 'fatitem' spacing
        $('.fatitem + br').remove();

        // add inject CSS
        $('head').append('<link rel="stylesheet" href="inject.css" />');

        res.send($('html').html());
      } else {
        // this should not happen as most non-HTML routes requested (ex: hn.js) have been changed to have mirror site hostname
        console.log('Requested non-HTML route: ' + mirrorURL);

        res.header('Content-Type', responseContentType);

        res.send(responseData);
      }
    })
    .catch((err) => {
      const statusCode = err.response.status;

      res.header('Content-Type', 'text/plain; charset=utf-8');
      if (statusCode === 404) {
        // HN typically shows the text 'Unknown.' on pages with 404 errors
        res.send('Unknown.');
      } else {
        res.send('Error ' + statusCode);
      }
    });
};

const unsupportedMethods = ['put', 'post', 'patch', 'delete'];

unsupportedMethods.forEach((method) => {
  app[method]('/', (req, res) => {
    res.status(405).send('Unsupported HTTP Method ' + method);
  });

  app[method]('/:route', (req, res) => {
    res.status(405).send('Unsupported HTTP Method ' + method);
  });
});

app.use(express.static('inject'));

app.get('/', mirrorSite);
app.get('/:route', mirrorSite);

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
