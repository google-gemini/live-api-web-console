import datetime

# Helper functions to mimic the TypeScript behavior
def sound_logs(n):
    return [
        {"date": datetime.datetime.now(), "type": "server.audio", "message": f"buffer (11250)", "count": 1} # Added count for consistency, though not in original TS for this helper
        for _ in range(n)
    ]

def realtime_logs(n):
    return [
        {"date": datetime.datetime.now(), "type": "client.realtimeInput", "message": "audio"}
        for _ in range(n)
    ]

mock_logs = [
    {
        "date": datetime.datetime.now(),
        "type": "client.open",
        "message": "connected",
    },
    {"date": datetime.datetime.now(), "type": "receive", "message": "setupComplete"},
    *realtime_logs(10),
    *sound_logs(10), # In the TS, soundLogs don't have a count, but the example output in logger.html shows one. I'll add a count of 1 to each generated sound log for now.
    {
        "date": datetime.datetime.now(),
        "type": "receive.content",
        "message": {
            "serverContent": {
                "interrupted": True,
            },
        },
    },
    {
        "date": datetime.datetime.now(),
        "type": "receive.content",
        "message": {
            "serverContent": {
                "turnComplete": True,
            },
        },
    },
    *realtime_logs(10),
    *sound_logs(20), # Added count of 1 here as well
    {
        "date": datetime.datetime.now(),
        "type": "receive.content",
        "message": {
            "serverContent": {
                "modelTurn": {
                    "parts": [{"text": "Hey its text"}, {"text": "more"}],
                },
            },
        },
    },
    {
        "date": datetime.datetime.now(),
        "type": "client.send",
        "message": {
            "turns": [
                {
                    "text": "How much wood could a woodchuck chuck if a woodchuck could chuck wood",
                },
                {
                    "text": "more text",
                },
            ],
            "turnComplete": False,
        },
    },
    {
        "date": datetime.datetime.now(),
        "type": "server.toolCall",
        "message": {
            "toolCall": {
                "functionCalls": [
                    {
                        "id": "akadjlasdfla-askls",
                        "name": "take_photo",
                        "args": {},
                    },
                    {
                        "id": "akldjsjskldsj-102",
                        "name": "move_camera",
                        "args": {"x": 20, "y": 4},
                    },
                ],
            },
        },
    },
    {
        "date": datetime.datetime.now(),
        "type": "server.toolCallCancellation",
        "message": {
            "toolCallCancellation": {
                "ids": ["akladfjadslfk", "adkafsdljfsdk"],
            },
        },
    },
    {
        "date": datetime.datetime.now(),
        "type": "client.toolResponse",
        "message": {
            "functionResponses": [
                {
                    "response": {"success": True},
                    "id": "akslaj-10102",
                },
            ],
        },
    },
    {
        "date": datetime.datetime.now(),
        "type": "receive.serverContent",
        "message": "interrupted",
    },
    {
        "date": datetime.datetime.now(),
        "type": "receive.serverContent",
        "message": "turnComplete",
    },
]
