import * as upl from "./upl.js";

/*
This is usually what `/lol-ranked/v1/notifications` endpoint returns looks like
You can know this either by reading client source code
or using some http debugger to intercept the http packet
*/
const rankedNotifications = [
    {
        tier: "DIAMOND",
        // We don't need this when `tier` === 'CHALLENGER' but you can keep it
        division: "I",
        displayType: "VIGNETTE",
        msgId: 11223344,
        notifyReason: "LEAGUE_PROMOTED",
        queueType: "RANKED_SOLO_5x5",
    },
];


/*
Same, but for `/lol-honor-v2/v1/level-change` endpoints
Note:
    Riot is refactoring the honor system (late Sept 2024), 
    so the honor notification JSON structure may change.
    (still working in patch 14.20 when writing down this line)
*/
const honorNotification = {
    actionType: "CHECKPOINT_REACHED",
    currentState: {
        checkpoint: 2,
        level: 3,
        rewardsLocked: false,
    },
    dynamicHonorMessage: {
        messageId: "RECENT_HEART",
        value: 4396,
    },
    previousState: {
        checkpoint: 1,
        level: 3,
        rewardsLocked: false,
    },
    reward: {
        quantity: 1,
        rewardType: "HONOR_LEVEL_5_CAPSULE",
    },
};

export function init(context) {
    // We must init upl first in Pengu init entry
    upl.init(context);
}

export function load() {
    // Press Ctrl+J to show a ranked promoting animiation
    window.addEventListener("keypress", (e) => {
        if (e.ctrlKey && e.code === "KeyJ") {
            upl.ws.fireEvent(
                "/lol-ranked/v1/notifications",
                rankedNotifications,
            );
        }
    });

    // Press Ctrl+U to show a honor progress promoting animation
    window.addEventListener("keypress", (e) => {
        if (e.ctrlKey && e.code === "KeyU") {
            /*
            Keep it 8(EVENT) and `OnJsonApiEvent` if you mean to
            *broadcast this message to LeagueClientUx*
            No explanations here tho, little bit complicated, just keep it
            */
            const payload = [
                8,
                "OnJsonApiEvent",
                {
                    data: honorNotification,
                    /*                                    
                    These 2 fields down below is not *required*
                    It's either lcux ignored them or handled them somewhere in the call stack
                    */

                    // eventType: "Update",
                    // uri: "/lol-honor-v2/v1/level-change"
                },
            ];
            upl.ws.publishMessage(
                "/lol-honor-v2/v1/level-change",
                JSON.stringify(payload),
            );
        }
    });
}
