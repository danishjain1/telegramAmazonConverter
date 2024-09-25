var fullURLRegex = /https?:\/\/(([^\s]*)\.)?amazon\.([a-z.]{2,5})(\/d\/([^\s]*)|\/([^\s]*)\/?(?:dp|o|gp|-)\/)(aw\/d\/|product\/)?(B[0-9]{2}[0-9A-Z]{7}|[0-9]{9}(?:X|[0-9]))([^\s]*)/gi;
var shortURLRegex = /https?:\/\/(([^\s]*)\.)?amzn\.to\/([0-9A-Za-z]+)/gi;
var shorten_links = true;
var tiny_token = "tiny-token";
var amazon_tag = "amazon-tld";
var amazon_tld = "in";
var rawUrlRegex = new RegExp(
  `https?://(([^\\s]*)\\.)?amazon\\.${amazon_tld}/?([^\\s]*)`,
  "ig"
);
var check_for_redirect_chains = false;
var group_replacement_message = "{MESSAGE}";
var raw_links = false;
var src_default = {
  async fetch(request, env) {
    return await handleRequest(request);
  }
};
async function handleRequest(request) {
  if (request.method === "POST") {
    const payload = await request.json();
    try {
      if (payload.message.chat.id == "xxxxchat_idxxx") {
        if ("message" in payload) {
          var message = payload.message;
          var text = payload.message.text;
          text = replaceTextLinks(message);
          text = text || message.caption;
          message.captionSavedAsText = text == message.caption;
          text = text.replaceAll("&", "and");
          shortURLRegex.lastIndex = 0;
          var replacements = [];
          var match;
          if (raw_links) {
            rawUrlRegex.lastIndex = 0;
            while ((match = rawUrlRegex.exec(text)) !== null) {
              const fullURL = match[0];
              replacements.push({ asin: null, fullURL });
            }
          } else {
            fullURLRegex.lastIndex = 0;
            while ((match = fullURLRegex.exec(text)) !== null) {
              const asin = match[8];
              const fullURL = match[0];
              replacements.push({ asin, fullURL });
            }
          }
          while ((match = shortURLRegex.exec(text)) !== null) {
            const shortURL = match[0];
            fullURLRegex.lastIndex = 0;
            const url2 = await getLongUrl(shortURL);
            if (url2 != null) {
              if (raw_links) {
                replacements.push({
                  asin: null,
                  expanded_url: url2.fullURL,
                  fullURL: shortURL
                });
              } else {
                replacements.push({
                  asin: getASINFromFullUrl(url2.fullURL),
                  fullURL: shortURL
                });
              }
            }
          }
          if (replacements.length > 0) {
            text = await buildMessage(
              message.chat.id,
              text,
              replacements,
              message.from
            );
            if (replacements.length > 1) {
              replacements.forEach((element) => {
                console.log(
                  "Long URL " + element.fullURL + " -> ASIN 1" + element.asin + " from 1 "
                );
              });
            } else {
              
            }
          }
          const chatId = message.chat.id;
          const url = `telegram_bot_api`;
          const data = await fetch(url).then((resp) => resp.json());
        }
      } else {
        const chatId = message.chat.id;
        const text2 = "you are not Auturized to use this bot";
        const url = `telegram_bot_api`;
        const data = await fetch(url).then((resp) => resp.json());
      }
    } catch (err) {
      return err;
    }
  }
  return new Response("OK");
}
function replaceTextLinks(msg) {
  if (msg.entities) {
    var offset_shift = 0;
    msg.entities.forEach((entity) => {
      let offset, length;
      if (entity.type == "text_link") {
        offset = entity.offset + offset_shift;
        length = entity.length;
        var new_text = "";
        if (offset > 0) {
          new_text += msg.text.substring(0, offset);
        }
        new_text += entity.url;
        offset_shift = entity.url.length - length;
        new_text += msg.text.substring(offset + length);
        msg.text = new_text;
      }
    });
    return msg.text;
  }
}
async function shortenURL(url) {
  const headers = {
    Authorization: `Bearer ${tiny_token}`,
    "Content-Type": "application/json"
  };
  url = url.split("tag=")[0] + "tag=" + amazon_tag;
  const body = { long_url: url, domain: "tinyurl.com" };
  try {
    const res = await fetch("https://api.tinyurl.com/create", {
      method: "post",
      headers,
      body: JSON.stringify(body)
    });
    const result = await res.json();
    if (result.link) {
      return result.link;
    } else {
      return url;
    }
  } catch (err) {
    return url;
  }
}
function buildAmazonUrl(asin) {
  return `https://www.amazon.${amazon_tld}/dp/${asin}?tag=${amazon_tag}`;
}
async function getAmazonURL(element) {
  const url = element.asin.length <= 10 ? buildAmazonUrl(element.asin) : element.asin;
  return shorten_links ? await shortenURL(url) : url;
}
async function buildMessage(chat, message, replacements, user) {
  var affiliate_message = message;
  for await (const element of replacements) {
    const sponsored_url = await getAmazonURL(element);
    affiliate_message = affiliate_message.replace(
      element.fullURL,
      sponsored_url
    );
  }
  return group_replacement_message.replace(/\\n/g, "\n").replace("{MESSAGE}", affiliate_message).replace("{ORIGINAL_MESSAGE}", message);
}
function getASINFromFullUrl(url) {
  const match = fullURLRegex.exec(url);
  return match != null ? match[8] : url;
}
async function getLongUrl(shortURL, chain_depth = 0) {
  try {
    chain_depth++;
    let res = await fetch(shortURL, { redirect: "manual" });
    let fullURL = res.headers.get("location");
    if (check_for_redirect_chains && chain_depth < max_redirect_chain_depth) {
      var nextRedirect = null;
      if (fullURL !== null) {
        nextRedirect = await getLongUrl(fullURL, chain_depth);
      }
      if (fullURL === null) {
        return { fullURL: shortURL, shortURL };
      } else {
        return { fullURL: nextRedirect["fullURL"], shortURL };
      }
    } else {
      if (fullURL === null) {
        return { fullURL: shortURL, shortURL };
      } else {
        return { fullURL, shortURL };
      }
    }
  } catch (err) {
     return err;
  }
}
// export {
//   src_default as default
// };
//# sourceMappingURL=index.js.map
