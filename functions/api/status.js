import {statusResponse} from '../../src/monitoring.js';
export function onRequest(context){return statusResponse(context.request)}
