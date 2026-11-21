'use strict';

const Alexa = require('ask-sdk-core');
const dashboardDocument = require('./apl/dashboard.json');
const { buildDashboardData } = require('./apl/datasource');
const { getTimeZone } = require('./lib/time');
const { performTileAction } = require('./lib/tiles');
const { performMediaAction } = require('./lib/media');

const DOCUMENT_TOKEN = 'dashboard';

function supportsAPL(handlerInput) {
  const interfaces = Alexa.getSupportedInterfaces(handlerInput.requestEnvelope);
  return Boolean(interfaces && interfaces['Alexa.Presentation.APL']);
}

async function renderDashboard(handlerInput, speech) {
  const rb = handlerInput.responseBuilder;
  if (!supportsAPL(handlerInput)) {
    return rb
      .speak('This dashboard needs a device with a screen, like an Echo Show.')
      .withShouldEndSession(true)
      .getResponse();
  }

  const timeZone = await getTimeZone(handlerInput);
  const dashboard = await buildDashboardData({ timeZone });
  rb.addDirective({
    type: 'Alexa.Presentation.APL.RenderDocument',
    token: DOCUMENT_TOKEN,
    document: dashboardDocument,
    datasources: { dashboard },
  });
  if (speech) rb.speak(speech);
  // Leaving shouldEndSession unset keeps the screen up without opening the mic.
  return rb.getResponse();
}

const LaunchHandler = {
  canHandle(handlerInput) {
    const type = Alexa.getRequestType(handlerInput.requestEnvelope);
    if (type === 'LaunchRequest') return true;
    if (type !== 'IntentRequest') return false;
    return ['ShowDashboardIntent', 'RefreshIntent', 'AMAZON.NavigateHomeIntent'].includes(
      Alexa.getIntentName(handlerInput.requestEnvelope)
    );
  },
  handle(handlerInput) {
    return renderDashboard(handlerInput);
  },
};

// Touch events sent by the APL document's SendEvent commands.
const UserEventHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Alexa.Presentation.APL.UserEvent';
  },
  async handle(handlerInput) {
    const args = handlerInput.requestEnvelope.request.arguments || [];
    const [action, value] = args;
    const rb = handlerInput.responseBuilder;

    if (action === 'tile') {
      try {
        const tile = await performTileAction(value);
        // Toggles already updated themselves on screen. Scenes change other
        // devices, so redraw to show their new states.
        if (tile && tile.type === 'scene') return renderDashboard(handlerInput);
        return rb.getResponse();
      } catch (e) {
        console.error('Tile action failed:', e.message);
        return renderDashboard(handlerInput, `Sorry, I couldn't reach ${e.tileName || 'that device'}.`);
      }
    }

    if (action === 'media') {
      try {
        await performMediaAction(value);
        return rb.getResponse();
      } catch (e) {
        console.error('Media action failed:', e.message);
        return renderDashboard(handlerInput, "Sorry, I couldn't reach the media player.");
      }
    }

    if (action === 'refresh') return renderDashboard(handlerInput);
    return rb.getResponse();
  },
};

const HelpHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      ['AMAZON.HelpIntent', 'AMAZON.FallbackIntent'].includes(Alexa.getIntentName(handlerInput.requestEnvelope))
    );
  },
  handle(handlerInput) {
    return renderDashboard(
      handlerInput,
      'Tap a tile to switch it on or off. Tap the clock to refresh. Say stop to close the dashboard.'
    );
  },
};

const StopHandler = {
  canHandle(handlerInput) {
    return (
      Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest' &&
      ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(Alexa.getIntentName(handlerInput.requestEnvelope))
    );
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder.withShouldEndSession(true).getResponse();
  },
};

const SessionEndedHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    const { reason, error } = handlerInput.requestEnvelope.request;
    if (error) console.error('Session ended with error:', reason, JSON.stringify(error));
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Unhandled error:', error && error.stack ? error.stack : error);
    return handlerInput.responseBuilder
      .speak('Sorry, something went wrong loading your dashboard.')
      .withShouldEndSession(true)
      .getResponse();
  },
};

function buildSkill() {
  return Alexa.SkillBuilders.custom()
    .addRequestHandlers(LaunchHandler, UserEventHandler, HelpHandler, StopHandler, SessionEndedHandler)
    .addErrorHandlers(ErrorHandler)
    .withApiClient(new Alexa.DefaultApiClient())
    .withCustomUserAgent('makealexa-dashboard/1.0');
}

exports.handler = buildSkill().lambda();
exports.buildSkill = buildSkill;
