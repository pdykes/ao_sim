## How to run the Demo

1. go through the setup step.  You will need to have the video files from Tushar put in whatever folder you set in default.json
2. copy my config/simulation_time_events.json to your config folder
3. in seperate terminals run ```npm run monitor4``` and ```npm run monitor6```.  Size the Chrome windows so that you can see them both
4. run telemetry, event_manager, monitor, and then node ao.js --control telemetry --operation enable.  Note, I added a bunch of package.json scripts to your items to make them easier to run.  Can submit if you want.

## Setup

1. edit /config/default.json 
```
"react": {
        "videos": {
            "src": "./server/public/videos",
            "tags": {
                "front": "front-final.mp4",
                "front-lidar": "Front-Lidar.mp4",
                "rear": "rear-final.mp4",
                "left-5a": "left-5a.mp4",
                "left-5b": "left-5b.mp4",
                "left-5c": "left-5c.mp4"
            }
        },
        "images": {
            "src": "./server/public/images",
            "tags": {
                "busmap": "BusMap.png"
            }
        }
    }
```
    
2. copy /config/simulation_time_events.json to your config folder, or update your default.json to use this file
3. on any monitor that will show BestMile, open the url and log in: 
- https://localmotors.env.partners.bestmile.io
- User: localmotors@bestmile.com
- Pwd: epDJgN5D

## Install

```npm install```

## How to Run

You start the client and server with the below command.  This example is for monitor1, but its the same for 2,3,4,5a,5b,5c and 6

``npm run monitor4``

This will also start Chrome.  It is not currently in kiosk mode since that makes testing a pain.


## Events

| Property  | Description |
| ------------- | ------------- |
| name  | A descriptive name of the element you want to create or modify.  Once an element is created you can alter it in subsequent events just using the name and payload data  |
| event | this must always be set to 'display' |
| payload.device  | name of the device you are sending the event to.  all\|monitor4\|monitor5a\|monitor5b\|monitor5c\|monitor6  |
| payload.action | All elements have 'show' and 'hide' action.  'delete' will completely destroy the element. Video has additional action|
| payload.element | The type of element you wish to create. video\|web\|bestMile\|image\|message\|kintrans_avatar |
| payload.depth | (optional) used to order elements of a specific type.  depth=0 will be rendered below everything else.  No two elements of the same type can have the same depth |
| payload.top\|left\|width\|height | position and size the element.  This does not affect messages (they are always center of the screen |
| payload.fullscreen | element is shown full screen (overrides position settings).  This does not affect messages |

#### Depth of elements
The display order of the elements.  Web will always display on top of Video.  Image on top of Web. etc.

1. Video
2. Web
3. BestMile
4. Image
5. Message


### Video

Open a window for a video.  Once a video is shown it can be paused and started again with a 'play' action.  To restart the video just send a 'hide' action followed by a 'show'

| Property  | Description |
| ------------- | ------------- |
| payload.action | **show** - make the element visible and start playing, **hide** - not visible but will load in the background, **pause** - pause the video, **play** - start the video playing again|
| payload.src | the name of the video to play, or a url for a youtube video |
| payload.tag | tag for video file as defined in default.json.  You can only specify a src or a tag |
| payload.playbackrate | increase to speed up the video playback |

Example:
Create a video element.  It is hidden but will load in the background
```
{
  "name": "rear_video", 
  "event": "display",
  "payload": {
    "device": "monitor5a",
    "action": "hide",
    "element": "video",
    "tag": "front",
    "fullscreen": false,
    "depth": 0,
    "playbackrate": 1,
    "top": 600,
    "left": 100,
    "width": 600,
    "height": 400
  }
}
```

Show the video in a later event

```
{
  "name": "rear_video", 
  "event": "display",
  "payload": {
    "action": "show",
  }
}
```
### Message (POI)

Show a message popup.  All messages automatically close in 5 seconds (please let me know if you want this configurable or changed)

| Property  | Description |
| ------------- | ------------- |
| txt | the text to display in the message |

```
{
  "name": "message",
  "event": "display",
  "payload": {
    "device": "monitor4",
    "element": "message",
    "txt": "We have arrived at Discovery Square.",
  }
}
```

### Web

Open a window for a url (BestMile)

| Property  | Description |
| ------------- | ------------- |
| action | show\|hide |

```
{
  "name": "some_web_element",
  "event": "display",
  "payload": {
    "device": "monitor4",
    "action": "show",
    "element": "web",
    "src": "https://www.google.com/",
    "fullscreen": true
  }
}
```

### BestMile

Open a BestMile web element.  It will always be shown at width 960, or width 1060 if controlCenter=true.  The height defaults to 960 but you can override it.

| Property  | Description |
| ------------- | ------------- |
| action | show\|hide |
| controlCenter | boolean (true\|false) |

```
{
  "name": "best_mile",
  "event": "display",
  "payload": {
    "device": "monitor6",
    "action": "show",
    "element": "bestMile",
    "controlCenter": false
  }
}
```

### Image
Show an image.  You must specify a "tag" or "filename"

| Property  | Description |
| ------------- | ------------- |
| tag | shortcut to a filename defined in default.json |


```
{
  "name": "image_example",
  "event": "display",
  "payload": {
    "device": "monitor5b",
    "action": "show",
    "element": "image",
    "tag" "busmap",
    "top": 200,
    "left": 200,
    "width": 100
  }
}
```

### KinTrans Avatar

Open and show a KinTrans avatar message

| Property  | Description |
| ------------- | ------------- |
| action | show\|hide |
| styles | object of CSS properties |
| message | string message for avatar to sign |

```
{
  "name": "kintrans",
  "event": "display",
  "payload": {
    "device": "monitor5c",
    "action": "show",
    "element": "kintrans_avatar",
    "styles": {
        "top": "200px",
        "left": "100px",
        "width": "600px",
        "height": "410px",
        "position": "absolute"
    },
    "message": "i need help"
  }
}
```

### Clear all

Delete all elements

```
{
"name": "clear_all_content",
"event": "display",
"payload": {
  "device": "all"
 }
}
````
# Example

Please refer to https://github.com/AccessibleOlli/olli-monitor/blob/master/config/simulation_time_events.json
There you will see elements being preloaded at the start of the simulation, and then used later (in a shortened event form)
