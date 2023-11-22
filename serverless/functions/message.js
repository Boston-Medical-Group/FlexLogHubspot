const FunctionTokenValidator = require('twilio-flex-token-validator').functionValidator;
const fetch = require("node-fetch");

/**
 * @typedef {import('twilio').Twilio} TwilioClient
 */

/**
 * 
 * @param {TwilioClient} twilioClient 
 * @param {string} conversationSid 
 * @returns 
 */
const getHtmlMessage = async (twilioClient, conversationSid) => {
  let resultHtml = '<ul style="list-style:none;padding:0;">';

  try {

    const resp = await twilioClient.conversations.v1.conversations(conversationSid)
      .messages
      .list({ limit: 500 });

    let bgColor = 'transparent';
    resp.forEach(message => {
      bgColor = bgColor === 'transparent' ? '#0091ae12' : 'transparent'; 
      resultHtml += `<li style="background-color: ${bgColor};border: 1px solid #cfdae1;padding: 5px;margin-bottom: 4px;"><div style="color: #5d7185;font-weight: bold;margin-bottom:5px;"><span class="">${message.author}</span> - <span style="color: #738ba3;font-size: 9px;">${message.dateCreated.toLocaleString()}</span></div><div style="padding: 6px;color: #333f4d;"><p>${message.body}</p></div></li>`
    })

    resultHtml += '</ul>';

  } catch (err) {
    console.error(`Oeps, something is wrong ${err}`);
  }

  return resultHtml;
}

// @ts-ignore
exports.handler = FunctionTokenValidator(async function (  _,  event,  callback) {

  const {
    conversationSid,
    hubspot_contact_id,
    hs_communication_channel_type,
    hs_communication_logged_from,
    hs_communication_body,
    hs_timestamp
  } = event

  try {
    if (!hubspot_contact_id) {
      throw new Error('CRMID Inválido');
    }

    let logBody = hs_communication_body;
    logBody += '<br /><br />';
    logBody += await getHtmlMessage(_.getTwilioClient(), conversationSid);

    let hubspotBody = JSON.stringify({
      properties: {
        hs_communication_channel_type,
        hs_communication_logged_from,
        hs_communication_body: logBody,
        hs_timestamp
      },
      associations: [
        {
          to: {
            id: hubspot_contact_id
          },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 81
            }
          ]
        }
      ]
    });

    console.log(hubspotBody);

    const request = await fetch(`https://api.hubapi.com/crm/v3/objects/communications`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`
      },
      body: hubspotBody
    });

    if (!request.ok) {
      console.log(request)
      throw new Error('Error while retrieving data from hubspot');
    }

    const data = await request.json();

    const response = new Twilio.Response();
    response.appendHeader("Access-Control-Allow-Origin", "*");
    response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST GET");
    response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

    response.appendHeader("Content-Type", "application/json");
    response.setBody(data);
    // Return a success response using the callback function.
    callback(null, response);


  } catch (err) {

    if (err instanceof Error) {
      const response = new Twilio.Response();
      response.appendHeader("Access-Control-Allow-Origin", "*");
      response.appendHeader("Access-Control-Allow-Methods", "OPTIONS POST GET");
      response.appendHeader("Access-Control-Allow-Headers", "Content-Type");

      response.appendHeader("Content-Type", "plain/text");
      response.setBody(err.message);
      response.setStatusCode(500);
      // If there's an error, send an error response
      // Keep using the response object for CORS purposes
      console.error(err);
      callback(null, response);
    } else {
      callback(null, {});
    }

  }
})
