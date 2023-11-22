import React from 'react';
import { FlexPlugin } from '@twilio/flex-plugin';
import * as Flex from '@twilio/flex-ui';
import { ITask } from '@twilio/flex-ui';

const PLUGIN_NAME = 'FlexLogHubspotPlugin';

const LogHubspotCall = async (task : ITask, manager : Flex.Manager) => {
  // if task.attributes.hubspot_contact_id is not available end this callback
  //const { postCallLog } = useApi({ token: manager.store.getState().flex.session.ssoTokenPayload.token });
  console.log('JRUMEAU sending', task.attributes);

  const mapOutcome : { [key: string]: string } = {
    "NO_ANSWER": "73a0d17f-1163-4015-bdd5-ec830791da20",
    "BUSY": "9d9162e7-6cf3-4944-bf63-4dff82258764",
    "WRONG_NUMBER": "17b47fee-58de-441e-a44c-c6300d46f273",
    "LEFT_LIVE_MESSAGE": "a4c4c377-d246-4b32-a13b-75a56a4cd0ff",
    "LEFT_VOICEMAIL": "b2cf5968-551e-4856-9783-52b3da59a7d0",
    "CONNECTED": "f240bbac-87c9-4f6e-bf70-924b57d47db7"
  }

  const direction = task.attributes.direction.toUpperCase();
  let params : any = {}
  if (direction === 'INBOUND') {
    params = {
      //hs_object_id: task.attributes.hubspot_contact_id ?? null,
      hs_call_callee_object_id: task.attributes.hubspot_contact_id ?? null,
      // convert task.dateCreated Date Object to UTC time and to timestamp
      hs_timestamp: Date.parse(task.dateCreated.toUTCString()),
      // @todo custom disposition codes
      hs_call_body: `${task.attributes.conversations?.outcome} - "${task.attributes.conversations?.content}"
          - DISPOSITION: ${task.attributes.conversations?.outcome}`,
      hs_call_callee_object_type_id: '0-1',
      hs_call_direction: direction,
      hs_call_disposition: mapOutcome[task.attributes.conversations?.outcome],
      hs_call_duration: task.age * 1000,
      hs_call_from_number: task.attributes.from,
      hs_call_to_number: task.attributes.to,
      hs_call_recording_url: task.attributes.conversations?.segment_link ?? null,
      hs_call_status: task.status == 'completed' ? 'COMPLETED' : 'CALLING_CRM_USER',
      //hs_call_title: ''
      //hubspot_owner_id: task.attributes.hubspot_contact_id ?? null,
    }
  } else if (direction === 'OUTBOUND') {
    params = {
      //hs_object_id: task.attributes.hubspot_contact_id ?? null,
      hs_call_callee_object_id: task.attributes.hubspot_contact_id ?? null,
      // convert task.dateCreated Date Object to UTC time and to timestamp
      hs_timestamp: Date.parse(task.dateCreated.toUTCString()),
      // @todo custom disposition codes
      hs_call_body: `${task.attributes.conversations?.outcome} - "${task.attributes.conversations?.content}"
            - DISPOSITION: ${task.attributes.conversations?.outcome}`,
      hs_call_callee_object_type_id: '0-1',
      hs_call_direction: task.attributes.direction?.toUpperCase(),
      hs_call_disposition: mapOutcome[task.attributes.conversations?.outcome],
      hs_call_duration: task.age * 1000,
      hs_call_from_number: task.formattedAttributes.from,
      hs_call_to_number: task.formattedAttributes.outbound_to,
      hs_call_recording_url: task.attributes.conversations?.segment_link ?? null,
      hs_call_status: task.status == 'completed' ? 'COMPLETED' : 'CALLING_CRM_USER',
      //hs_call_title: ''
      //hubspot_owner_id: task.attributes.hubspot_contact_id ?? null,
    }
  }

  const token = manager.store.getState().flex.session.ssoTokenPayload.token;
  const request = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/call`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...params,
      Token: token
    })
  }).then(() => console.log('Log Sent'))
    .catch(() => console.log('Error while sending the log'))
    .finally(() => console.log('Done log'));
}

const LogHubspotMessage = async (task: ITask, manager: Flex.Manager) => {
  console.log('JRUMEAU sending', task.attributes);
  if (!task.attributes.hubspot_contact_id) { 
    return;
  }
  
  const params = {
    conversationSid: task.attributes.conversationSid,
    hubspot_contact_id: task.attributes.hubspot_contact_id ?? null,
    hs_communication_channel_type: task.attributes.channelType == 'whatsapp' ? 'WHATS_APP' : 'SMS',
    hs_communication_logged_from: 'CRM',
    hs_communication_body: `${task.attributes.conversations?.outcome} - "${task.attributes.conversations?.content}"
    - Duración: ${task.age} segundos`,
    hs_timestamp: Date.parse(task.dateCreated.toUTCString()),
  }

  const token = manager.store.getState().flex.session.ssoTokenPayload.token;
  const request = await fetch(`${process.env.FLEX_APP_TWILIO_SERVERLESS_DOMAIN}/message`, {
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...params,
      Token: token
    })
  }).then(() => console.log('Log Sent'))
    .catch(() => console.log('Error while sending the log'))
    .finally(() => console.log('Done log'));
}

export default class FlexLogHubspotPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  /**
   * This code is run when your plugin is being started
   * Use this to modify any UI components or attach to the actions framework
   *
   * @param flex { typeof import('@twilio/flex-ui') }
   * @param manager { typeof import('@twilio/flex-ui').Manager }
   */
  async init(flex: typeof Flex, manager: Flex.Manager) {

    manager.events.addListener('taskWrapup', (task: ITask) => {
      task.attributes.duration = task.age;
      console.log(task.age);
    })

    manager.events.addListener("taskCanceled", (task: ITask) => {
      console.log('TASKCANCELED', task);
    });
    manager.events.addListener('taskCompleted', (task: ITask) => {
      console.log('TASKCOMPLETED', task);
      if (task.taskChannelUniqueName === 'voice') { 
        LogHubspotCall(task, manager);
      } else if (task.taskChannelUniqueName == 'chat' || task.taskChannelUniqueName == 'sms') {
        LogHubspotMessage(task, manager);
      }
    });
  }


}
