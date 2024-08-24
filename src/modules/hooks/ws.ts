import { Core } from 'src/core'
import { Once } from 'src/utils/once'

type JSONValue =
    | number
    | string
    | boolean
    | null
    | JSONObject
    | JSONArray;

type JSONObject = { [key: string]: JSONValue };
type JSONArray = JSONValue[];

type PublishMethod = (endpoint: string, jsonString: JSONValue) => void

enum WSMessageType {
    WELCOME = 0,
    PREFIX = 1,
    CALL = 2,
    CALLRESULT = 3,
    CALLERROR = 4,
    SUBSCRIBE = 5,
    UNSUBSCRIBE = 6,
    PUBLISH = 7,
    EVENT = 8
}


let _wsHookMap: { [id: string]: (content: any, original: (content: any) => void) => void } = {}
let _publishMethod: PublishMethod | undefined = undefined;
const _initOnce = new Once(init)


/**
 * Fire a websocket event, which will be broadcasted to LeagueClient.
 * @param endpoint The endpoint to fire the event on.
 * @param payload The payload to send with the event, should be a valid JSON value.
 */
export function fireEvent(endpoint: string, payload: JSONValue) {
    _initOnce.trigger()
    _publishMethod
        ? _publishMethod(
            endpoint,
            JSON.stringify(
                [
                    WSMessageType.EVENT,
                    "OnJsonApiEvent",
                    { "data": payload }
                ]
            )
        )   
        : console.error("UPL: Tried to fire websocket event but _publishMethod is undefined!");

}

/**
 * Hook a websocket endpoint.
 */
export function hook(endpoint: string, callback: (content: any, original: (content: any) => void) => void) {
    _initOnce.trigger()
    _wsHookMap[endpoint] = callback
}

/**
 * Hook a websocket text endpoint.
 */
export function hookText(endpoint: string, callback: (content: string, original: (content: string) => void) => void) {
    hook(endpoint, (content, original) => {
        if (typeof content !== 'string') {
            console.error('UPL: Tried to hook text websocket endpoint but content is not a string!')
            return original(content)
        }

        const _original = (newContent: string) => {
            original(newContent)
        }

        callback(content, _original)
    })
}

function init() {
    let context = Core?.Context

    if (context == null) {
        throw new Error("UPL is not initialized!")
    }

    let pluginRunnnerContext = Core?.pluginRunnnerContext
    _publishMethod = pluginRunnnerContext.context.socket._dispatcher.publish.bind(pluginRunnnerContext.context.socket._dispatcher)

    context.rcp.postInit('rcp-fe-common-libs', async (api) => {
        let originalGetDataBinding = api.getDataBinding

        api.getDataBinding = async function (rcp_name: string) {
            let originalDataBinding = await originalGetDataBinding.apply(this, arguments)

            let hookedDataBinding = function (this: any, basePath: string, socket: any) {
                let dataBinding = originalDataBinding.apply(this, arguments)
                let cache = dataBinding.cache

                // FIXME: Hooking _triggerResourceObservers only changes data on update,
                // and doesn't change it on initial databinding call if data is cached (iirc)

                let originalTriggerObservers = cache._triggerResourceObservers
                cache._triggerResourceObservers = function (this: any, endpoint: string, content: any, error: any) {
                    const callback = _wsHookMap[endpoint]
                    if (callback == undefined) {
                        return originalTriggerObservers.apply(this, [endpoint, content, error])
                    }

                    let original = (content: any) => {
                        originalTriggerObservers.apply(this, [endpoint, content, error])
                    }

                    return callback(content, original)
                }

                return dataBinding
            }

            // @ts-ignore
            hookedDataBinding.bindTo = function (socket: any) {
                let result = originalDataBinding.bindTo.apply(this, arguments)
                result.dataBinding = hookedDataBinding
                return result
            }

            return Promise.resolve(hookedDataBinding)
        }
    })
}
