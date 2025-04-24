import { FunctionDeclaration } from "@google/generative-ai";
import { SchemaType } from "@google/generative-ai";
import { useEffect, useState } from "react";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { ToolCall } from "../../multimodal-live-types";
import { Lightbulb, Fan, Tv, AirVent, VenetianMask } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import './canvas.scss';
import { randomUUID } from "crypto";

// const declaration: FunctionDeclaration = {
//     name: "render_altair",
//     description: "Displays an altair graph in json format.",
//     parameters: {
//       type: SchemaType.OBJECT,
//       properties: {
//         json_graph: {
//           type: SchemaType.STRING,
//           description:
//             "JSON STRING representation of the graph to render. Must be a string, not a json object",
//         },
//       },
//       required: ["json_graph"],
//     },
// };

const getCurrentDate: FunctionDeclaration = {
    name: "get_current_date",
    description: "Gets the current date.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    }
};

const setDeviceStatus: FunctionDeclaration = {
    name: "set_device_status",
    description: "Sets the status of a device.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        deviceId: {
          type: SchemaType.STRING,
          description:
            "The id of the device to set the status of.",
        },
        deviceStatus: {
            type: SchemaType.STRING,
            description: "The status to set the device to.",
            enum: ['on', 'off'],
        },
      },
      required: ["deviceId", "deviceStatus"],
    },
};

const getDevice: FunctionDeclaration = {
    name: "get_device",
    description: "Gets a specific device.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        deviceId: {
          type: SchemaType.STRING,
          description:
            "The id of the device to get.",
        },
      },
      required: ["deviceId"],
    },
};

const getAllDevices: FunctionDeclaration = {
    name: "get_all_devices",
    description: "Gets all devices.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
};

const getAllAutomations: FunctionDeclaration = {
    name: "get_all_automations",
    description: "Gets all automations.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
      required: [],
    },
};

const getAutomation: FunctionDeclaration = {
    name: "get_automation",
    description: "Gets a specific automation.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        automationId: {
          type: SchemaType.STRING,
          description: "The id of the automation to get.",
        },
      },
      required: ["automationId"],
    },
};

const createAutomation: FunctionDeclaration = {
    name: "create_automation",
    description: "Creates a new automation.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        automationName: {
          type: SchemaType.STRING,
          description: "The name of the automation to create.",
        },
        automationDescription: {
          type: SchemaType.STRING,
          description: "The description of the automation to create.",
        },
        action: {
          type: SchemaType.OBJECT,
          properties: {
            deviceId: {
              type: SchemaType.STRING,
              description: "The id of the device to set the status of.",
            },
            deviceStatus: {
              type: SchemaType.STRING,
              description: "The status to set the device to.",
              enum: ['on', 'off'],
            },
          },
        },
        trigger: {
          type: SchemaType.OBJECT,
          properties: {
            datetime: {
              type: SchemaType.STRING,
              description: "The datetime to set the automation to.",
              format: "date-time",
            },
          },
          required: ["datetime"],
        },
      },
      required: ["automationName", "automationDescription", "action", "trigger"],
    },
};

const deleteAutomation: FunctionDeclaration = {
    name: "delete_automation",
    description: "Deletes a specific automation.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        automationId: {
          type: SchemaType.STRING,
          description: "The id of the automation to delete.",
        },
      },
      required: ["automationId"],
    },
};

const updateAutomation: FunctionDeclaration = {
    name: "update_automation",
    description: "Updates a specific automation.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        automationId: {
          type: SchemaType.STRING,
          description: "The id of the automation to update.",
        },
        automationName: {
          type: SchemaType.STRING,
          description: "The name of the automation to update.",
        },
        automationDescription: {
          type: SchemaType.STRING,
          description: "The description of the automation to update.",
        },
        automationAction: {
          type: SchemaType.OBJECT,
          description: "The action of the automation to update.",
        },

      },
      required: ["automationId"],
    },
};

type DeviceStatus = 'on' | 'off' | 'unknown';
type DeviceType = 'light' | 'fan' | 'tv' | 'air conditioner' | 'curtain' | 'unknown';

interface Location {
    floor: 'Ground' | 'First'
    room: string;
}

interface Device {
    deviceId: string;
    deviceName: string;
    deviceType: DeviceType;
    deviceStatus: DeviceStatus;
    deviceLocation: Location;
}

interface SetStateAction {
    deviceId: string;
    deviceStatus: DeviceStatus;
}

interface AutomationTrigger {
    datetime: Date;
}

type AutomationAction = SetStateAction;

interface Automation {
    automationId: string;
    automationName: string;
    automationDescription: string;
    action: AutomationAction;
    trigger: AutomationTrigger;
}

const initialDevices: Device[] = [
    {
        deviceId: '1',
        deviceName: 'Living Room Main Light',
        deviceType: 'light',
        deviceStatus: 'on',
        deviceLocation: {
            floor: 'Ground',
            room: 'Living Room',
        },
    },
    {
        deviceId: '2',
        deviceName: 'Living Room Fan',
        deviceType: 'fan',
        deviceStatus: 'on',
        deviceLocation: {
            floor: 'Ground',
            room: 'Living Room',
        },
    },
    {
        deviceId: '3',
        deviceName: 'Downstairs Hallway Light',
        deviceType: 'light',
        deviceStatus: 'on',
        deviceLocation: {
            floor: 'Ground',
            room: 'Downstairs Hallway',
        },
    },
    {
        deviceId: '4',
        deviceName: 'Downstairs Hallway Fan',
        deviceType: 'fan',
        deviceStatus: 'on',
        deviceLocation: {
            floor: 'Ground',
            room: 'Downstairs Hallway',
        },
    },
    {
        deviceId: '5',
        deviceName: 'Kitchen Light',
        deviceType: 'light',
        deviceStatus: 'on',
        deviceLocation: {
            floor: 'Ground',
            room: 'Kitchen',
        },
    },
    {
        deviceId: '6',
        deviceName: 'Upstairs Hallway Light',
        deviceType: 'light',
        deviceStatus: 'off',
        deviceLocation: {
            floor: 'First',
            room: 'Upstairs Hallway',
        },
    },
    {
        deviceId: '7',
        deviceName: 'Master Bedroom Light',
        deviceType: 'light',
        deviceStatus: 'off',
        deviceLocation: {
            floor: 'First',
            room: 'Master Bedroom',
        },
    },
    {
        deviceId: '8',
        deviceName: 'Master Bedroom Fan',
        deviceType: 'fan',
        deviceStatus: 'off',
        deviceLocation: {
            floor: 'First',
            room: 'Master Bedroom',
        },
    },
]

const initialAutomations: Automation[] = [
    {
        automationId: '1',
        automationName: 'Living Room Light Automation',
        automationDescription: 'Turns on the living room light when the sun is setting',
        action: {
            deviceId: '1',
            deviceStatus: 'on',
        },
        trigger: {
            datetime: new Date(),
        },
    },
]

const getDeviceIcon = (deviceType: DeviceType) => {
  switch (deviceType) {
    case 'light':
      return <Lightbulb size={24} />;
    case 'fan':
      return <Fan size={24} />;
    case 'tv':
      return <Tv size={24} />;
    case 'air conditioner':
      return <AirVent size={24} />;
    case 'curtain':
      return <VenetianMask size={24} />;
    default:
      return <Lightbulb size={24} />;
  }
};

export default function Canvas() {
    const [devices, setDevices] = useState<Device[]>(initialDevices);
    const [automations, setAutomations] = useState<Automation[]>(initialAutomations);
    const { client, setConfig } = useLiveAPIContext();

    useEffect(() => {
        setConfig({
        model: "models/gemini-2.0-flash-exp",
        generationConfig: {
            responseModalities: "audio",
            speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } },
            },
        },
        systemInstruction: {
            parts: [
                {
                    text: 'You are my helpful home assistant who will help me control all the devices in my home. Here is a list of all the devices in my home: ' + JSON.stringify(devices, null, 2),
                },
            ],
        },
        tools: [
            // there is a free-tier quota for search
            { googleSearch: {} },
            { functionDeclarations: [setDeviceStatus, getDevice, getAllDevices, getAllAutomations, getAutomation, createAutomation, deleteAutomation, updateAutomation, getCurrentDate] },
        ],
        });
    }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      for (const fc of toolCall.functionCalls) {
        console.log(`got function call`, fc);
        switch (fc.name) {
            case setDeviceStatus.name: {
                const { deviceId: statusDeviceId, deviceStatus } = (fc.args as any);
                setDevices(prev => prev.map(d => d.deviceId === statusDeviceId ? { ...d, deviceStatus } : d));
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { success: true } }, id: fc.id }],
                });
                break;
            }
            case getDevice.name: {
                const { deviceId: getDeviceId } = (fc.args as any);
                const device = devices.find(d => d.deviceId === getDeviceId);
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { device } }, id: fc.id }],
                });
                break;
            }
            case getAllDevices.name: {
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { devices } }, id: fc.id }],
                });
                break;
            }
            case getAllAutomations.name: {
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { automations } }, id: fc.id }],
                });
                break;
            }
            case getAutomation.name: {
                const { automationId: getAutomationId } = (fc.args as any);
                const automation = automations.find(a => a.automationId === getAutomationId);
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { automation } }, id: fc.id }],
                });
                break;
            }
            case createAutomation.name: {
                const { automationName, automationDescription, action, trigger } = (fc.args as any);
                const newAutomation:Automation = {
                    automationId: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
                    automationName,
                    automationDescription,
                    action,
                    trigger,
                };
                setAutomations(prev => [...prev, newAutomation]);
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { success: true } }, id: fc.id }],
                });
                break;
            }
            case deleteAutomation.name: {
                const { automationId: deleteAutomationId } = (fc.args as any);
                setAutomations(prev => prev.filter(a => a.automationId !== deleteAutomationId));
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { success: true } }, id: fc.id }],
                });
                break;
            }
            case updateAutomation.name: {
                const { automationId: updateAutomationId, automationName, automationDescription, action, trigger } = (fc.args as any);
                setAutomations(prev => prev.map(a => a.automationId === updateAutomationId ? { ...a, automationName, automationDescription, action, trigger } : a));
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { success: true } }, id: fc.id }],
                });
                break;
            }
            case getCurrentDate.name: {
                const currentDate = new Date();
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { currentDate } }, id: fc.id }],
                });
                break;
            }
            default: {
                console.log(`unknown function call`, fc);
                client.sendToolResponse({
                    functionResponses: [{ response: { output: { success: true } }, id: fc.id }],
                });
                break;
            }
        }
      }
    };
    client.on("toolcall", onToolCall);
    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client]);

  const handleDeviceStatusChange = (deviceId: string, newStatus: DeviceStatus) => {
    setDevices(prev => prev.map(d => d.deviceId === deviceId ? { ...d, deviceStatus: newStatus } : d));
  };

  return (
    <div className="canvas">
        <h2>Devices</h2>
        <div className="devices-grid">
            {devices.map(device => (
                <div key={device.deviceId} className="device-card">
                    <div className="device-icon">
                        {getDeviceIcon(device.deviceType)}
                    </div>
                    <div className="device-info">
                        <h3>{device.deviceName}</h3>
                        <p>{device.deviceLocation.room}</p>
                        <p>{device.deviceLocation.floor} floor</p>
                    </div>
                    <div className="device-status">
                        <button 
                            className={`status-toggle ${device.deviceStatus}`}
                            onClick={() => handleDeviceStatusChange(device.deviceId, device.deviceStatus === 'on' ? 'off' : 'on')}
                        >
                            <span className="toggle-indicator"></span>
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <h2>Automations</h2>
        <div className="automations-table">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Device</th>
                        <th>Schedule</th>
                    </tr>
                </thead>
                <tbody>
                    {automations.map(automation => {
                        const device = devices.find(d => d.deviceId === automation.action.deviceId);
                        return (
                            <tr key={automation.automationId}>
                                <td>{automation.automationName}</td>
                                <td>{automation.automationDescription}</td>
                                <td>{device?.deviceName || 'Unknown Device'}</td>
                                <td>{formatDistanceToNow(automation.trigger.datetime, { addSuffix: true })}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </div>

  )
}
