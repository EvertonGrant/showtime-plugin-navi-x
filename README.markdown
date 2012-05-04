## Overview

## Features
- PLX Playlists
- RSS Playlists
- Flickr XML
- Video/Processors:
-- If a processor fails (gives error different than "This processor is empty, nothing to do...") add an entry to a local store that must be sent to facanferff
-- TMDB For movies

- Item Listing:
-- Display information about the date of an item
-- Display URL and Processor if available

- User Account: 
-- Enable/Disable Login Popup
-- Add Video/Playlist to Favorites
-- Remove from Favorites
-- Create Playlist
-- Add to Playlist
-- Enable/Disable Adult Content (in settings page)
-- Automatically add video to History playlist (if it already exists, moves it to top)
-- Set if new playlists should be private or public (History playlist is by default private and can't change in the plugin)

- Search (needs external keyboard)

## FAQ
### 1. Live Streams from playlists are supported in Showtime?
Yes they are, but they should be in rtmp protocol, there is no support for mms or http live streaming in Showtime. You can watch even TV Channels added from other Navi-X user but I'll 
not tell you where, search Navi-X and you might find it.

### 2. There are some sections that says "XBMC Only", I can't use them in Showtime?
Some of them you can, those entries are labelled like that because the videos contained in those playlists are rtmp link, that XBMC supports while other platforms can't support, 
but Showtime supports it and you can use it as well, you're free to navigate these playlists.

### 3. There are some sections that says "Boxee Only", I can't use them in Showtime?
During development, I faced myself with some playlists labelled like these and some of them didn't work since the feature behind that makes the playlist only supportable for Boxee 
is the HTML support that Showtime can't support, you might try these playlists but most possibly the plugin will not be able to get you the playlist, in these cases you'll get an empty 
playlist.

### 4. You talk about Processors in this plugin several time, what are they?
Well to quote from http://www.navixtreme.com/:
"The purpose of the processor is to function as an online plugin for Navi-X which produces media playback parameters for a single item, 
normally starting with only the URL of the web page which contains the item. In other words, if a web page has a flash player embedded in it, 
the processor teaches Navi-X how to emulate that site's flash player to get the media in the page to play in Showtime."

### 5. When I logged in the first time to Navi-X server, was added some few playlists to my account what should I know about it?
These created playlists pretend to make easier and better your experience in Navi-X plugin for Showtime. For your privacy, any playlist created by the plugin are saved as Private,
it means only you can access those, if you want you might change it in http://www.navixtreme.com/.
Currently, these are the playlists created automatically by the plugin:
- Favorites: Keeps a list of items that you marked as Favorite

- History: List in which is added a video when you select a video to play and it starts playing, if it gives any error from the Processor part it will be discarded. 
NOTE: Video links that don't play too due to lack of support from Showtime are added too automatically (no way to check it in current Showtime's API)
NOTE 2: If you play a video that was added already to the playlist History, the plugin will remove the one that exist and insert a new one on top of playlist,
creating a fresh copy.

### 6. What is the status of WatchTV plugin?
With this new plugin, WatchTV plugin became obsoleted, there's no reason to use anymore the system that WatchTV provided, in this plugin you can watch too Live Streams normally and with 
the advantage of viewing those that were added by other users without having work of setting up a server or using a keyboard to enter a link.

### 7. Where can I find facanferff to talk about Showtime?
facanferff is sometimes in Efnet on channel #showtime, you might try to find him there. There will be there some other helpful people ready to assist you.

### 8. How can I give feedback, suggest or report bugs?
To report bugs you can create a ticket in the official bug tracking managed by facanferff and running in andoma's website (http://www.lonelycoder.com/redmine/projects/navix/issues/new).