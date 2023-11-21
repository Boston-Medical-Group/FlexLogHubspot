const FunctionTokenValidator = require('twilio-flex-token-validator').functionValidator;
const fetch = require("node-fetch");

// @ts-ignore
exports.handler = FunctionTokenValidator(async function (  _,  event,  callback) {

  const {
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

    const request = await fetch(`https://api.hubapi.com/crm/v3/objects/communications`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`
      },
      body: JSON.stringify({
        properties: {
          hs_communication_channel_type,
          hs_communication_logged_from,
          hs_communication_body,
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
      })
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
