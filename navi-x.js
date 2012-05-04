/**
 * Navi-X plugin for showtime by facanferff (Fábio Canada / facanferff@hotmail.com)
 *
 *  Copyright (C) 2011 facanferff (Fábio Canada / facanferff@hotmail.com)
 * 
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.showtime.
 */


(function(plugin) {

    var PREFIX = "navi-x";
    var plxVersion = 8;

    var downloader = new Downloader();
    var store = new Store();
    var tmdb = new TMDB();
    var server;
    var playlist;

    var background_image1 = plugin.path + 'resources/background1.jpg';
  
    var home_URL = 'http://navi-x.googlecode.com/svn/trunk/Playlists/home.plx';

    // stores
    var report_processors = plugin.createStore('report_processors', true);
  
    var service = plugin.createService("Navi-X", "navi-x:start", "video", true,
			   plugin.path + "logo.png");
						   
    var settings = plugin.createSettings("Navi-X",
					  plugin.path + "logo.png",
					 "Navi-X: Online Media Resources");

    settings.createInfo("info",
				 plugin.path + "logo.png",
				 "Navi-X. Create your playlists on http://www.navixtreme.com/ \n" + 
				 "Plugin developed by facanferff \n");

    settings.createDivider('Browser Settings');

    settings.createBool("backgroundEnabled", "Background", false, function(v) { service.backgroundEnabled = v; });

    settings.createDivider('User Settings (only functional if logged in)');

    settings.createBool("login", "Enable Log In Popup", true, function(v) { service.login = v; });
    settings.createBool("adult", "Adult Content", false, function(v) { service.adult = v; });
    settings.createBool("playlistsVisibility", "New Playlists Private", true, function(v){ service.playlistsVisibility = v; });

    settings.createDivider('Video Settings');

    settings.createBool("advanced", "Enable Advanced Mode for Videos (Video information, User Actions)", false, function(v) { service.advanced = v; });
    settings.createBool("tmdb", "TMDB Scraper", false, function(v) { service.tmdb = v; });
  
    function startPage(page) {
        var v = 3 * 10000000 +  5 * 100000 + 212;
        if (showtime.currentVersionInt < v) {
            page.error('Your version of Showtime is outdated for this plugin. Look at https://www.lonelycoder.com/showtime/download for a new build of it.');
            return;
        }

        page.type = "directory";
        page.contents = "items";

        server = new Server();

        if (service.login == '1')
            server.login();

        playlist = new Playlist(page, home_URL, new MediaItem());
        var result = playlist.loadPlaylist(home_URL);

        page.loading = false;
    }

    plugin.addURI(PREFIX + ":playlist:(.*):(.*)", function(page, type, url) {
        var result = -1;
	
        page.type = "directory";
        page.contents = "items";
	
        var mediaitem = new MediaItem();
        mediaitem.type = unescape(type);
        mediaitem.URL = unescape(url);

        playlist = new Playlist(page, mediaitem.URL, mediaitem);
	
        page.loading = false;

        if (mediaitem.type.slice(0,6) == 'search') {
            result = playlist.parseSearch();
        }
        else
            result = playlist.loadPlaylist(mediaitem.URL);

        showtime.trace(result.message);
        if (result.error)
        {
            page.error(result.errorMsg);
        }
    });

    plugin.addURI(PREFIX + ":video:(.*):(.*):(.*)", function(page, title, url, proc) {
        var video = unescape(url);
    
        for (var i = 0; i < playlist.list.length; i++) {
            var item = playlist.list[i];
            if (item.URL == video) {
                var id = i;
            }
        }

        if (proc != 'undefined' && proc != '') {
            var mediaitem = new MediaItem();
            mediaitem.URL = unescape(url);
            mediaitem.processor = unescape(proc);

            var processor = new Processor(mediaitem);

            processor.NIPL.vars['s_url'] = mediaitem.URL;
            var result = processor.getUrl(page, mediaitem);
        }

        page.loading = false;

        if (proc != 'undefined' && proc != '' && result.error) {
            showtime.trace(result.message);
            page.error(result.message);
        }
        else {
            if (server.authenticated())
                server.addToPlaylist("History", playlist.list[id]);

            if (proc != 'undefined' && proc != '') {
                showtime.trace(result.message);
                video = result.video;
            }

            var url_end = video.indexOf('|');
            if (url_end != -1)
                video = video.slice(0, url_end);

            showtime.trace('Video Playback: Reading ' + video);

            page.source = "videoparams:" + showtime.JSONEncode({      
                title: unescape(title),     
                sources: [
	        {
	            url: video
	        }]    
            });    
            page.type = "video";
        }
    });

    plugin.addURI(PREFIX + ":videoscreen:([0-9]*)", function (page, id) {
        page.type = "item";

        page.metadata.logo = playlist.list[id].thumb;
        page.metadata.icon = playlist.list[id].thumb;
        page.metadata.title = playlist.list[id].name;

        var alternative = false;

        if (service.tmdb == '1') {
            var item = tmdb.getMovie(playlist.list[id].name);

            if (item) {
                page.metadata.title = item.title;
                var data = showtime.JSONDecode(showtime.httpGet("http://api.themoviedb.org/3/configuration", {
                    'api_key': tmdb.key
                }, {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }).toString());
                var base_url = data.images.base_url;
                var size = "original";

                page.metadata.icon = base_url + size + item.poster_path;
                page.metadata.title = item.title;
                page.metadata.logo = base_url + size + item.poster_path;
                if (service.backgroundEnabled == "1")
                    page.metadata.background = base_url + size + item.backdrop_path;

                var genres = "";
                for (var i in item.genres) {
                    var entry = item.genres[i];
                    genres += entry.name
                    if (i < item.genres.length - 1)
                        genres += ', ';
                }

                page.appendPassiveItem("label", new showtime.RichText(item.release_date), {title: "Release Date"});
                page.appendPassiveItem("label", new showtime.RichText(genres), {title: "Genres"});
                page.appendPassiveItem("label", new showtime.RichText(showtime.durationToString(parseInt(item.runtime * 60))), {title: "Duration"});
                page.appendPassiveItem("label", new showtime.RichText(item.tagline), {title: "Tagline"});
                page.appendPassiveItem("label", new showtime.RichText('$' + item.budget), {title: "Budget"});
                page.appendPassiveItem("label", new showtime.RichText('$' + item.revenue), {title: "Revenue"});

                page.appendPassiveItem("rating", parseFloat((item.vote_average / 2) / 5));
    
                page.appendPassiveItem("divider");  
        
                page.appendPassiveItem("bodytext", new showtime.RichText(item.overview));
            }
            else alternative = true;
        }
        if (service.tmdb != '1' || alternative) {
            page.appendPassiveItem("label", new showtime.RichText(playlist.list[id].URL),{title: "URL"});
            page.appendPassiveItem("label", new showtime.RichText(playlist.list[id].processor), {title: "Processor"});

            if (playlist.list[id].rating)
                page.appendPassiveItem("rating", parseFloat(playlist.list[id].rating / 5));
    
            page.appendPassiveItem("divider");  
        
            page.appendPassiveItem("bodytext", new showtime.RichText(playlist.list[id].description));
        }
    
        page.appendAction("navopen", PREFIX + ':video:' + escape(playlist.list[id].name) + ":" +
        escape(playlist.list[id].URL) + ":" + escape(playlist.list[id].processor), true, {
            title:'Watch Now'});
        
        if (server.authenticated()) {
            page.appendAction("pageevent", "addToPlaylist", true, {title:'Add to Playlist'});

            if (!server.existInPlaylist(playlist.list[id], 'Favorites'))
                page.appendAction("pageevent", "addFavorite", true, {title:'Add Favorite'});
            else
                page.appendAction("pageevent", "removeFavorite", true, {title:'Remove Favorite'});
            
            page.onEvent('addToPlaylist', function() {
                var titleInput = showtime.textDialog('Title of Playlist: ', true, true);

                if (search.rejected) {
                    return;
                }
                try {
                    var title = titleInput.input;
                    if (title.length == 0) {
                        return;
                    }

                    if (server.addToPlaylist(title, playlist.list[id]))
                        showtime.message('Entry was added syccesfully to the playlist ' + title + '.', true, false);
                    else
                        showtime.message('There was one error while trying to add this entry to the playlist', true, false);
                }
                catch(ex) { }
            });

            page.onEvent('addFavorite', function() {
                if (!server.existInPlaylist(playlist.list[id], 'Favorites')) {
                    if (server.addToPlaylist('Favorites', playlist.list[id]))
                        showtime.message('Navixtreme: Entry was added syccesfully to the playlist Favorites.', true, false);
                    else
                        showtime.message('Navixtreme: There was one error while trying to add this entry to the playlist', true, false);
                }
                else showtime.message('Navixtreme: Entry exists already in the target playlist.', true, false);
            });

            page.onEvent('removeFavorite', function() {
                if (server.removeFromPlaylist('Favorites', playlist.list[id]))
                    showtime.message('Entry was removed syccesfully to the playlist Favorites.', true, false);
                else
                    showtime.message('There was one error while trying to remove this entry to the playlist', true, false);
            });
        }
	
        page.loading = false;
    });

    plugin.addURI(PREFIX + ":playlist:screen", function (page) {
        page.type = "item";

        if (service.backgroundEnabled == "1")
            page.metadata.background = playlist.background;

        page.metadata.logo = playlist.thumb;
        page.metadata.icon = playlist.thumb;
        page.metadata.title = playlist.title;

        page.appendPassiveItem("label", new showtime.RichText(playlist.title),{title: "Name"});
        page.appendPassiveItem("label", new showtime.RichText(playlist.type), {title: "Type"});
        if (playlist.date)
            page.appendPassiveItem("label", new showtime.RichText(playlist.date), {title: "Date"});

        if (playlist.rating && playlist.rating != '-1.00')
            page.appendPassiveItem("rating", parseFloat(playlist.rating) / 5);
    
        if (playlist.bodytext) {
            page.appendPassiveItem("divider");  
            page.appendPassiveItem("bodytext", new showtime.RichText(item.overview));
        }
    
        if (server.authenticated()) {
            playlist.URL = playlist.path;

            if (!server.existInPlaylist(playlist, 'Favorites'))
                page.appendAction("pageevent", "addFavorite", true, {title:'Add Favorite'});
            else
                page.appendAction("pageevent", "removeFavorite", true, {title:'Remove Favorite'});
        
            page.onEvent('addFavorite', function() {
                if (!server.existInPlaylist(playlist, 'Favorites')) {
                    if (server.addToPlaylist('Favorites', playlist))
                        showtime.message('Navixtreme: Entry was added syccesfully to the playlist Favorites.', true, false);
                    else
                        showtime.message('Navixtreme: There was one error while trying to add this entry to the playlist', true, false);
                }
                else showtime.message('Navixtreme: Entry exists already in the target playlist.', true, false);
            });

            page.onEvent('removeFavorite', function() {
                if (server.removeFromPlaylist('Favorites', playlist))
                    showtime.message('Navixtreme: Entry was removed syccesfully to the playlist Favorites.', true, false);
                else
                    showtime.message('Navixtreme: There was one error while trying to remove this entry to the playlist', true, false);
            });
        }
	
        page.loading = false;
    });

    function Playlist(page, filename, mediaitem) {
        //defaults
        this.version = '-1';

        this.page = page;
        this.mediaitem = mediaitem;

        this.path = filename;

        this.list = [];

        // Render page or not
        this.render = true;

        this.background = mediaitem.background; 
        this.logo = 'none';
        if (this.mediaitem.thumb != 'default')
            this.logo = this.mediaitem.thumb;
        //
        this.title = '';
        this.type = 'playlist';
        this.description = '';
        this.view = this.mediaitem.view;
        this.processor = this.mediaitem.processor;
        this.playmode = 'default';

        this.start_index = 0;

        // TODO: Pagination
        //this.start_index = 0;

        this.parseSearch = function() {
            var search = showtime.textDialog('Search: ' + this.mediaitem.name, true, false);

            var result = {};
			
            if (search.rejected) {
                result.error = true;
                result.errorMsg = 'User cancelled search.';
                return result;
            }
            var searchstring = search.input;
            if (searchstring.length == 0) {
                result.error = true;
                result.errorMsg = 'Empty search string.';
                return result;
            }
    
            //get the search type:
            var index = this.mediaitem.type.indexOf(":");
            var search_type;
            if (index != -1)
                search_type = item.type.slice(index+1);
            else
                search_type = '';
		
            var fn;
            var mediaitem;
		
            //youtube search
            if (this.mediaitem.type == 'search_youtube') {
                fn = searchstring.replace(/ /g,'+');
                var URL = '';
                if (item.URL != '')
                    URL = this.mediaitem.URL;
                else
                    URL = 'http://gdata.youtube.com/feeds/base/videos?max-results=50&alt=rss&q=';
                URL = URL + fn;
                // Use for now Published sort by default
                URL = URL + '&orderby=published';
			   
                this.mediaitem=new MediaItem();
                this.mediaitem.URL = URL;
                this.mediaitem.type = 'rss:video';
                this.mediaitem.name = 'search results: ' + searchstring;
                this.mediaitem.processor = this.mediaitem.processor;
                this.loadPlaylist(this.mediaitem.URL);
            }
            else { //generic search
                fn = searchstring.replace(/ /g,'+');   
                var URL = this.mediaitem.URL;
                this.mediaitem=new MediaItem();
                this.mediaitem.URL = URL + fn;
                if (search_type != '')
                    this.mediaitem.type = search_type;
                else //default
                    this.mediaitem.type = 'playlist';
					
                this.mediaitem.name = 'search results: ' + searchstring;
                this.mediaitem.processor = this.mediaitem.processor;
                this.loadPlaylist(this.mediaitem.URL);
            }

            // Should not get this far
            return -1;
        }

        this.parsePLX = function() {
            var result = {};

            var content = downloader.getRemote(this.path);

            if (content == "") {
                result.error = true;
                result.errorMsg = content.error;
                return result;
            }

            content = content.response.split(/\r?\n/);

            //parse playlist entries 
            var counter = 0;
            var state = 0;
            var tmp='';
            var previous_state = 0;
		
            var key = '';
            var value = '';
            var index = -1;

            for (var i in content) {
                var m = content[i];
                if (state == 2) //parsing description field
                {
                    index = m.indexOf('/description');
                    if (index != -1)
                    {
                        this.description = this.description + "\n" + m.slice(0, index);
                        state = 0;
                    }
                    else
                        this.description = this.description + "\n" + m;
                }
                else if (state == 3) //parsing description field
                {
                    index = m.indexOf('/description');
                    if (index != -1)
                    {
                        tmp.description = tmp.description + "\n" + m.slice(0, index);
                        state = 1;
                    }
                    else
                        tmp.description = tmp.description + "\n" + m;
                }
                else if (state == 4) //multiline comment
                {
                    if (m.slice(0,3) == '"""')
                        state = previous_state;
                }
                else if (m && m[0] != '//')
                {
                    if (m.slice(0,3) == '"""')
                    {
                        previous_state = state;
                        state = 4; //muliline comment state
                        continue; //continue with next line
                    }
                    if (m[0] == '#') {
                        var id = parseInt(m.slice(2));

                        if (id) {
                            if (state == 1)
                                this.list.push(tmp);
                            else //state=0                        
                                this.list.splice(0, this.list.length);

                            tmp = new MediaItem(); //create new item
                            tmp.id = id;

                            counter = counter + 1;
                            state = 1;
                        }
                    }

                    index = m.indexOf('=');
                    if (index != -1)
                    {
                        key = m.slice(0, index);
                        value = m.slice(index+1, m.length);
                        if (key == 'version' && state == 0)
                        {
                            this.version = value;
                            //check the playlist version
                            if (parseInt(this.version) > parseInt(plxVersion))
                                return -1 //invalid
                            else
                                this.list.splice(0, this.list.length);
                        }
                        else if (key == 'background' && state == 0)
                            this.background=value;
                        else if (key == 'logo' && state == 0)
                            this.logo=value;
                            //         
                        else if (key == 'title' && state == 0)
                            this.title=value;
                        else if (key == 'description' && state == 0)
                        {
                            index = value.indexOf('/description');
                            if (index != -1)
                                this.description=value.slice(0,index);
                            else
                            {
                                this.description=value;
                                state = 2; //description on more lines
                            }
                        }
                        else if (key == 'playmode' && state == 0)
                            this.playmode=value;
                        else if (key == 'view' && state == 0)
                            this.view=value;                           
                        else if (key == 'type')
                        {
                            if (!tmp.id) {
                                if (state == 1)
                                    this.list.push(tmp);
                                else //state=0                        
                                    this.list.splice(0, this.list.length);

                                tmp = new MediaItem(); //create new item

                                counter = counter + 1;
                                state = 1;
                            }

                            tmp.type = value;
                            if (tmp.type == 'video' || tmp.type == 'audio')
                            {
                                tmp.processor = this.processor;
                            }
                        }
                        else if (key == 'version' && state == 1)
                            tmp.version=value;
                        else if (key == 'name')
                            tmp.name=value;
                        else if (key == 'date')
                            tmp.date=value;  
                        else if (key == 'thumb')
                            tmp.thumb=value;
                        else if (key == 'icon')
                            tmp.icon=value;    
                        else if (key == 'URL')
                            tmp.URL=value;
                            /*else if (key == 'DLloc')
                        tmp.DLloc=value;*/
                        else if (key == 'background')
                            tmp.background=value;
                        else if (key == 'rating')
                            tmp.rating=value;
                        else if (key == 'infotag')
                            tmp.infotag=value;                        
                        else if (key == 'view')
                            tmp.view=value;  
                        else if (key == 'processor')
                            tmp.processor=value;
                        else if (key == 'playpath')
                            tmp.playpath=value;
                        else if (key == 'swfplayer')
                            tmp.swfplayer=value;    
                        else if (key == 'pageurl')
                            tmp.pageurl=value;   
                        else if (key == 'description')
                        {
                            //this.description = ' ' //this will make the description field visible
                            index = value.indexOf('/description');
                            if (index != -1)
                                tmp.description=value.slice(0, index);
                            else
                            {
                                tmp.description=value;
                                state = 3; //description on more lines 
                            }
                        }
                    }
                }
            }
		
            if ((state == 1) || (previous_state == 1))
                this.list.push(tmp);

            showtime.trace('Playlist: Parsed ' + this.list.length + ' items');
		
            result.error = false;
            return result;
        };

        this.parseRSS = function() {
            var result = {};

            if (this.path.slice(0,6) == 'rss://')      
                this.path = this.path.replace('rss:', 'http:')

            var content = downloader.getRemote(this.path).response;

            if (content == "") {
                result.error = true;
                result.errorMsg = "Input playlist is empty.";
                return result;
            }

            content = content.split('<item');

            //parse playlist entries 
            var counter = 0;
            var state = 0;
            var tmp='';
            var previous_state = 0;
		
            var key = '';
            var value = '';
            var index = -1;

            //set the default type
            var index = mediaitem.type.indexOf(":")
            var type_default;
            if (index != -1)
                type_default = mediaitem.type.slice(index+1);
            else
                type_default = '';
		
            var counter = 0;
    
            //parse playlist entries 
            for (var i in content) {
                var m = content[i];
                if (counter == 0) {
                    //fill the title
                    index = m.indexOf('<title>');
                    if (index != -1) {
                        var index2 = m.indexOf('</title>');
                        if (index != -1) {
                            var value = m.slice(index+7,index2);
                            this.title = value;
                        }
                    }

                    index = m.indexOf('<description>');
                    if (index != -1) {
                        index2 = m.indexOf('</description>');
                        if (index2 != -1) {
                            value = m.slice(index+13,index2);
                            this.description = value;
                            var index3 = this.description.indexOf('<![CDATA[');
                            if (index3 != -1)
                                this.description = this.description.slice(9,this.description-3);
                        }
                    }
				
                    //fill the logo
                    index = m.indexOf('<image>');
                    if (index != -1) {
                        index2 = m.indexOf('</image>');
                        if (index != -1) {
                            index3 = m.indexOf('<url>', index, index2);
                            if (index != -1) {
                                var index4 = m.indexOf('</url>', index, index2);
                                if (index != -1)
                                    value = m.slice(index3+5,index4);
                                this.logo = value;
                            }
                        }
                    }
                    else { //try if itunes image
                        index = m.indexOf('<itunes:image href="');
                        if (index != -1) {
                            index2 = m.indexOf('"', index+20);
                            if (index != -1) {
                                value = m.slice(index+20,index2);
                                this.logo = value;
                            }
                        }
                    }
	   
                    counter++;
                }
                else {
                    var tmp = new MediaItem(); //create new item
                    tmp.processor = this.processor;

                    //get the publication date.
                    /*index = m.indexOf('<pubDate')
				if (index != -1) {
					index2 = m.indexOf('>', index)
					if (index2 != -1) {
						index3 = m.indexOf('</pubDate')
						if (index3 != -1) {
							index4 = m.indexOf(':', index2, index3)
							if (index4 != -1) {
								value = m.slice(index2+1,index4-2)
								value = value.replace('\n',"") 
								tmp.date = value
							}
						}
					}
				}*/

                    //get the title.
                    index = m.indexOf('<title');
                    if (index != -1) {
                        index2 = m.indexOf('>', index);
                        if (index2 != -1) {
                            index3 = m.indexOf('</title>');
                            if (index3 != -1) {
                                index4 = m.indexOf('![CDATA[', index2, index3);
                                if (index4 != -1)
                                    value = m.slice(index2+10,index3-3);
                                else
                                    value = m.slice(index2+1,index3);
                                value = value.replace('\n'," '");                         
                                tmp.name = tmp.name + value;
                            }
                        }
                    }
											 
                    //get the description.
                    var index1 = m.indexOf('<content:encoded>');
                    index = m.indexOf('<description>');
                    if (index1 != -1) {
                        index2 = m.indexOf('</content:encoded>');
                        if (index2 != -1) {
                            value = m.slice(index1+17,index2);
                            //value = value.replace('&#39;',"\'");   
                            tmp.description = value;
                            index3 = tmp.description.indexOf('<![CDATA[');
                            if (index3 != -1)
                                tmp.description = tmp.description.slice(9,-3);
                        }
                    }
                    else if (index != -1) {
                        index2 = m.indexOf('</description>');
                        if (index2 != -1) {
                            value = m.slice(index+13,index2);
                            //value = value.replace('&#39;',"\'"); 
                            tmp.description = value;
                            index3 = tmp.description.indexOf('<![CDATA[');
                            if (index3 != -1)
                                tmp.description = tmp.description.slice(9,-3);
                        }
                    }

                    //get the thumb
                    index = m.indexOf('<media:thumbnail');
                    if (index != -1) {
                        index2 = m.indexOf('url=', index+16);
                        if (index2 != -1) {
                            index3 = m.indexOf('"', index2+5);
                            if (index3 != -1) {
                                value = m.slice(index2+5,index3);
                                tmp.thumb = value;
                            }
                        }
                    }
							
                    if (tmp.thumb == 'default') {
                        //no thumb image found, therefore grab any jpg image in the item
                        index = m.indexOf('.jpg');
                        if (index != -1) {
                            index2 = m.lastIndexOf('http', 0, index);
                            if (index2 != -1) {
                                value = m.slice(index2,index+4);
                                tmp.thumb = value;
                            }
                        }
                    }
				
                    //get the enclosed content.
                    index = m.indexOf('enclosure');
                    index1 = m.indexOf ('<media:content');
                    if (((index != -1) || (index1 != -1))) { // and (tmp.processor==''):
                        //enclosure is first choice. If no enclosure then use media:content
                        if ((index == -1) && (index1 != -1))
                            index = index1;
                        index2 = m.indexOf('url="',index); //get the URL attribute
                        if (index2 != -1)
                            index3 = m.indexOf('"', index2+5);
                        else {
                            index2 = m.indexOf("url='",index);
                            if (index2 != -1)
                                index3 = m.indexOf("'", index2+5);
                        }
                        if ((index2 != -1) && (index3 != -1))
                            value = m.slice(index2+5,index3);
                        tmp.URL = value;
					
                        //get the media type
                        if (type_default != '')
                            tmp.type = type_default;

                        if (tmp.type == 'unknown') {  
                            index2 = m.indexOf('type="',index); //get the type attribute
                            if (index2 != -1) {
                                index3 = m.indexOf('"', index2+6);
                                if (index3 != -1) {
                                    var type = m.slice(index2+6,index3);
                                    if (type.slice(0,11) == 'application')
                                        tmp.type = 'download';
                                    else if (type.slice(0,5) == 'video')
                                        tmp.type = 'video';
                                }
                            }
                        }
						
                        if ((tmp.type == 'unknown') && (tmp.URL != '')) { //valid URL found
                            //validate the type based on file extension
                            var ext_pos = tmp.URL.lastIndexOf('.'); //find last '.' in the string
                            if (ext_pos != -1) {
                                var ext = tmp.URL.slice(ext_pos+1)
                                ext = ext.toLowerCase();
                                if (ext == 'jpg' || ext == 'gif' || ext == 'png')
                                    tmp.type = 'image';
                                else if (ext == 'mp3')
                                    tmp.type = 'audio';
                                else
                                    tmp.type = 'video';
                            }
                        }
                    }
                    if ((tmp.type == 'unknown') || (tmp.processor != '')) {
                        //else: //no enclosed URL and media content or the processor tag has been set, use the link
                        index = m.indexOf('<link>');
                        if (index != -1) {
                            index2 = m.indexOf('</link>', index+6);
                            if (index2 != -1) {
                                value = m.slice(index+6,index2);
                                tmp.URL = value;
						
                                //get the media type
                                if (type_default != '')
                                    tmp.type = type_default;
                                else if (value.slice(0,6) == 'rss://')
                                    tmp.type = 'rss';               
                                else
                                    tmp.type = 'html';
                            }
                        }
                    }

                    if (tmp.URL != '') {
                        this.list.push(tmp);
                        counter += 1;
                    }
                }
            }
		
            result.error = false;
            return result;
        }

        this.parseATOM = function() {
            var result = {};

            var content = downloader.getRemote(this.path).response;

            if (content == "") {
                result.error = true;
                result.errorMsg = "Input playlist is empty.";
                return result;
            }

            content = content.split('<entry');
        
            //parse playlist entries 
            var counter = 0;
            var state = 0;
            var tmp='';
            var previous_state = 0;
		
            var key = '';
            var value = '';
            var index = -1;

            //set the default type
            var index = mediaitem.type.indexOf(":")
            var type_default;
            if (index != -1)
                type_default = mediaitem.type.slice(index+1);
            else
                type_default = '';
		
            var counter = 0;
		
            //parse playlist entries 
            for (var i in content) {
                var m = content[i];
                if (counter == 0) {
                    //fill the title
                    index = m.indexOf('<title>');
                    if (index != -1) {
                        var index2 = m.indexOf('</title>');
                        if (index != -1) {
                            var value = m.slice(index+7,index2);
                            this.title = value;
                        }
                    }

                    index = m.indexOf('<subtitle');
                    if (index != -1) {
                        index2 = m.indexOf('</subtitle>');
                        if (index2 != -1) {
                            value = m.slice(index+13,index2);
                            this.description = value;
                            var index3 = this.description.indexOf('<![CDATA[');
                            if (index3 != -1)
                                this.description = this.description.slice(9,-3);
                        }
                    }
				
                    //fill the logo
                    index = m.indexOf('<logo>');
                    if (index != -1) {
                        index2 = m.indexOf('</logo>');
                        if (index2 != -1) {
                            index3 = m.indexOf('http', index, index2);
                            if (index3 != -1) {
                                var index4 = m.indexOf('</', index3, index2+2);
                                if (index4 != -1) {
                                    value = m.slice(index3,index4);
                                    this.logo = value;
                                }
                            }
                        }
                    }

                    //fill the logo
                    index = m.indexOf('<icon>');
                    if (index != -1) {
                        index2 = m.indexOf('</icon>');
                        if (index2 != -1) {
                            index3 = m.indexOf('http', index, index2);
                            if (index3 != -1) {
                                index4 = m.indexOf('</', index3, index2+2);
                                if (index4 != -1) {
                                    value = m.slice(index3,index4);
                                    this.logo = value;
                                }
                            }
                        }
                    }
 
                    counter += 1;
                }
                else {
                    var tmp = new MediaItem(); //create new item
                    tmp.processor = this.processor;

                    //get the publication date.
                    index = m.indexOf('<published');
                    if (index != -1) {
                        index2 = m.indexOf('>', index);
                        if (index2 != -1) {
                            index3 = m.indexOf('</published');
                            if (index3 != -1) {
                                index4 = m.indexOf(':', index2, index3);
                                if (index4 != -1) {
                                    value = m.slice(index2+1,index4-3);
                                    value = value.replace('\n',"");
                                    tmp.name = value;
                                }
                            }
                        }
                    }
								
                    //get the publication date.
                    index = m.indexOf('<updated');
                    if (index != -1) {
                        index2 = m.indexOf('>', index);
                        if (index2 != -1) {
                            index3 = m.indexOf('</updated');
                            if (index3 != -1) {
                                index4 = m.indexOf(':', index2, index3);
                                if (index4 != -1) {
                                    value = m.slice(index2+1,index4-3);
                                    value = value.replace('\n',"");
                                    tmp.name = value;
                                }
                            }
                        }
                    }
								
                    //get the title.
                    index = m.indexOf('<title');
                    if (index != -1) {
                        index2 = m.indexOf('>', index);
                        if (index2 != -1) {
                            index3 = m.indexOf('</title>');
                            if (index3 != -1) {
                                index4 = m.indexOf('![CDATA[', index2, index3);
                                if (index4 != -1)
                                    value = m.slice(index2+10,index3-3);
                                else
                                    value = m.slice(index2+1,index3);
                                value = value.replace('\n'," '");                         
                                tmp.name = tmp.name + ' ' + value;
                            }
                        }
                    }
											 
                    //get the description.
                    index = m.indexOf('<summary');
                    if (index != -1) {
                        index2 = m.indexOf('>', index);
                        if (index2 != -1) {
                            index3 = m.indexOf('</summary');
                            if (index3 != -1) {
                                value = m.slice(index2+1,index3);
                                value = value.replace('\n',"");
                                tmp.description = value;
                            }
                        }
                    }

                    if (tmp.description == '' && tmp.name != '')
                        tmp.description = tmp.name;

                    //get the thumb
                    index = m.indexOf('<link type="image');
                    if (index != -1) {
                        index2 = m.indexOf('href=', index+16);
                        if (index2 != -1) {
                            index3 = m.indexOf('"', index2+6);
                            if (index3 != -1) {
                                value = m.slice(index2+6,index3);
                                tmp.thumb = value;
                            }
                        }
                    }

                    if (tmp.thumb == 'default') {
                        //no thumb image found, therefore grab any jpg image in the item
                        index = m.indexOf('.jpg');
                        if (index != -1) {
                            index2 = m.rfind('http', 0, index);
                            if (index2 != -1) {
                                value = m.slice(index2,index+4);
                                tmp.thumb = value;
                            }
                        }
                    }

                    //get the enclosed content.
                    index = m.indexOf('<link rel="enclosure');  
                    if (index == -1) {
                        index = m.indexOf('<link');
                    }
                    else {
                        index2 = m.indexOf('href=',index); //get the URL attribute
                        if (index2 != -1) {
                            index3 = m.indexOf(m[index2+5], index2+6);
                            if (index3 != -1) {
                                value = m.slice(index2+6,index3);
                                tmp.URL = value;
                            }
                        }
										  
                        //get the media type
                        if (type_default != '')
                            tmp.type = type_default;

                        if (tmp.type == 'unknown') {  
                            index2 = m.indexOf('type="',index); //get the type attribute
                            if (index2 != -1) {
                                index3 = m.indexOf('"', index2+6);
                                if (index3 != -1) {
                                    var type = m.slice(index2+6,index3);
                                    if (type.slice(0,11) == 'application')
                                        tmp.type = 'download';
                                    else if (type.slice(0,5) == 'video')
                                        tmp.type = 'video';
                                }
                            }
                        }
						
                        if ((tmp.type == 'unknown') && (tmp.URL != '')) {//valid URL found
                            //validate the type based on file extension
                            var ext_pos = tmp.URL.lastIndexOf('.'); //find last '.' in the string
                            if (ext_pos != -1) {
                                var ext = tmp.URL.slice(ext_pos+1);
                                ext = ext.toLowerCase();
                                if (ext == 'jpg' || ext == 'gif' || ext == 'png')
                                    tmp.type = 'image';
                                else if (ext == 'mp3')
                                    tmp.type = 'audio';
                                else
                                    tmp.type = 'html';
                            }
                        }
                    }
													   
                    if (tmp.URL != '') {
                        this.list.push(tmp);
                        counter++;
                    }
                }
            }
					
            result.error = false;
            return result;
        }

        this.parseFlickr = function() {
            var result = {};

            var content = downloader.getRemote(this.path).response;

            if (content == "") {
                result.error = true;
                result.errorMsg = "Input playlist is empty.";
                return result;
            }

            content = content.split('<item ');
        
            var counter = 0;

            //parse playlist entries 
            for (var i in content) {
                var m = content[i];
                if (counter == 0) {
                    //fill the title
                    var index = m.indexOf('<title>');
                    if (index != -1) {
                        var index2 = m.indexOf('</title>');
                        if (index != -1) {
                            var value = m.slice(index + 7, index2);
                            this.title = value;
                        }
                    }
                
                    counter += 1;
                }
                else {
                    //get the title.
                    index = m.indexOf('<title>');
                    if (index != -1) {
                        index2 = m.indexOf('</title>', index);
                        if (index2 != -1) {
                            value = m.slice(index + 7, index2);
                            var name = value;
                        }
                    }

                    //get the enclosed content.
                    var items = 0;
                    index = m.indexOf('<description>');
                    if (index != -1) {
                        index2 = m.indexOf('</description>', index);
                        if (index2 != -1) {
                            var index3 = m.indexOf('src=', index);
                            while (index3 != -1) {
                                var index4 = m.indexOf('"', index3 + 5);
                                if (index4 != -1) {
                                    var tmp = new MediaItem(); //create new item
                                    tmp.type = 'image';
                                    if (items > 0)
                                        tmp.name = name + " " + (items+1);
                                    else
                                        tmp.name = name;
                            
                                    value = m.slice(index3 + 5, index4 - 4);
                                    if (value[value.length - 6] == '_')
                                        value = value.slice(0, value.length - 6) + ".jpg";
                                    tmp.URL = value;
                                    tmp.thumb = tmp.URL.slice(0, tmp.URL.length - 4) + "_m" + ".jpg";
                                
                                    this.list.push(tmp);
                                    counter += 1;

                                    items += 1;
                                    index3 = m.indexOf('src=', index4);
                                }
                            }
                        }
                    }
                }
            }
                
            return 0;
        }


        this.loadPlaylist = function(filename) {
            var init = new Date();

            if (filename != '')
                this.path = filename;
            else
                this.path = this.mediaitem.URL;

            var type = this.mediaitem.GetType(0);

            var result = {};

            //load the playlist  
            if (type == 'rss_flickr_daily') 
                result = this.parseFlickr();         
            else if (type.slice(0,3) == 'rss')
                result = this.parseRSS();
            else if (type.slice(0,4) == 'atom')
                result = this.parseATOM();
                /*else if (type == 'opml')
            result = playlist.load_opml_10(URL, mediaitem)
        */else //assume playlist file
                result = this.parsePLX();
				
            /*if (result == -1) //error
            showtime.trace("This playlist requires a newer Navi-X version", true, false);
        else if (result == -2) //error
            showtime.trace("Cannot open file.", true, false);*/

            var end = new Date();
            var time = end - init;

            result.message = 'NAVI-X: Parsed playlist succesfully (' + time + 'ms).';
				
            if (result.error) { //failure 
                result.message = 'NAVI-X: Failed to parse playlist (' + time + 'ms).';
                return result;
            }

            if (this.render == true)
                this.showPage(type);

            return result;
        }

        this.showPage = function(type) {
            this.type = type;
			
            //display the new URL on top of the screen
            var title = '';
            if (this.title.length > 0)
                title = this.title  + ' - (' + this.path + ')';
            else
                title = this.URL;
			
            var title_final = "";
            var renew=0;
            page.metadata.title = title;
            var tmp_title3 = '';
            if (title) {
                while(title.indexOf('[COLOR=FF') != -1)
                {
                    var color_index = title.indexOf('[COLOR=FF');
                    var color = title.slice(color_index+9, title.indexOf(']', color_index));
                    var text = title.slice(title.indexOf(']', color_index)+1, title.indexOf('[/COLOR]'));
                    title = title.toString().replace(title.toString().slice(color_index, title.indexOf(']', color_index)+1), '');
                    title = title.toString().replace(title.toString().slice(color_index, title.indexOf('[/COLOR]')+8), '');
                    var tmp_title1 = title.slice(0, color_index);
                    tmp_title3 = title.slice(title.indexOf('[/COLOR]')+8, title.length);
                    var tmp_title2 = text;
                    title_final+='<font color="#ffffff" size="2">'+tmp_title1+'</font>'+
			    '<font color="'+color+'" size="2">'+tmp_title2+'</font>';
                    renew=1;
                }
            }
            if (renew)
                page.metadata.title = new showtime.RichText(title_final+'<font color="#ffffff" size="2">'+tmp_title3+'</font>');
			
            //set the background image   
            if (service.backgroundEnabled == "1") {
                var m = this.background;
                if (m == "default" || m == "previous")
                    m = background_image1;
                page.metadata.background = m;
            }
			
            m = this.logo;
            page.metadata.logo = m;
			
            /*var newview = SetListView(playlist.view);
        page.contents = newview;*/
            page.contents = 'list';
			
            //Display the playlist page
            var page_size = 200;
            this.showPageRender(page, this.start_index / page_size, this.start_index % page_size); 
			
            return 0; //success
        }

        this.showPageRender = function(page, current_page, start_pos)
        {
            this.current_page = current_page;

            var today=new Date();
            var n=0;
            var page_size = 200;

            var playlist_details = this.path.match('playlist/([0-9]*)/(.+?).plx');

            this.name = this.title;

            if (playlist_details) {
                this.id = playlist_details[1];
                this.name = playlist_details[2];
            }

            page.appendItem(PREFIX + ':playlist:screen', "directory", {
                title: new showtime.RichText('Playlist Features')
            });

            for (var i = current_page*page_size; i < this.list.length; i++)
            {
                var m = this.list[i];
                if (parseInt(m.version) <= parseInt(plxVersion))
                {
                    if (!server.authenticated() && (m.URL === 'history.plx' ||  m.URL === 'favorites.plx' || m.URL === 'My Playlists' || m.URL === 'http://www.navixtreme.com/playlist/mine.plx'))
                        continue;

                    if (m.type === 'window' || m.type === 'html')
                        continue;

                    var icon = this.getPlEntryThumb(m);

                    var label2='';
                    if (m.date != '') {
                        try{
                            var dt = m.date.split()
                            var size = dt.length                       
                            var dat = dt[0].split('-')
                            var tim;
                            if (size > 1)
                                tim = dt[1].split(':')
                            else
                                tim = ['00', '00', '00']
							
                            var entry_date = new Date(dat[0],dat[1],dat[2],tim[0],tim[1],tim[2])
                            var days_past = (today.getDate()-entry_date.getDate())
                            var hours_past = MAt (today.getHours()-entry_date.getHours())
                            if ((size > 1) && (days_past == 0) && (hours_past < 24))
                                label2 = 'New ' + hours_past + ' hrs ago';
                            else if (days_past <= 10)
                                if (days_past == 0)
                                    label2 = 'New Today'
                                else if (days_past == 1)
                                    label2 = 'New Yesterday'
                                else
                                    label2 = 'New ' + days_past + ' days ago'
                            else if (this.playlist.type != 'playlist')
                                label2 = m.date.slice(0,10);
                        }
                        catch(err) {
                            showtime.trace("ERROR: Playlist contains invalid date at entry:  "+(n+1));
                        }
                    }
					
                    var link = m.URL;
                    if (link === 'My Playlists') {
                        link = 'http://www.navixtreme.com/playlist/mine.plx';
                        m.type = 'playlist';
                        m.name = 'My Playlists';
                    }
                    else if (link === 'favorites.plx') {
                        link = 'http://www.navixtreme.com/playlist/' + server.favorites_id + '/favorites.plx';
                    }
                    else if (link === 'history.plx') {
                        link = 'http://www.navixtreme.com/playlist/' + server.history_id + '/history.plx';
                    }
					
                    var name_final_color = '';
                    var name = m.name.replace(' (local disk)', '');

                    var tmp_name3 = '';
                    var renew = 0;
                    while(name.indexOf('[COLOR=FF') != -1)
                    {
                        var color_index = name.indexOf('[COLOR=FF');
                        var color = name.slice(color_index+9, name.indexOf(']', color_index));
                        var text = name.slice(name.indexOf(']')+1, name.indexOf('[/COLOR]'));
                        var tmp_name1 = name.slice(0, color_index);
                        var tmp_name2 = text;
                        tmp_name3 = name.slice(name.indexOf('[/COLOR]')+8, name.length);
                        name = name.toString().replace(name.toString().slice(color_index, name.indexOf(']', color_index)+1), '');
                        name = name.toString().replace(name.toString().slice(color_index, name.indexOf('[/COLOR]')+8), '');
                        name_final_color+=tmp_name1+
							'<font color="'+color+'">'+tmp_name2+'</font>';
                        renew=1;
                    }
                    if (!renew)
                        name_final_color = m.name;
                    if (m.type == "video" || m.type == "audio" || m.type == "playlist")
                        name_final_color+=tmp_name3;
                    if (label2 != '')
                        name_final_color+='<font color="#ADFF2F">'+' ('+label2+')'+'</font>';
                    var playlist_link = escape(m.type);
                    playlist_link+=":"+escape(link);

                    if (!m.processor)
                        m.processor = 'undefined';

                    var titleText = '\n';
                    if (m.URL)
                        titleText += '<font size="2" color="87cefa">' + 'URL: ' + m.URL + '</font>';
                    if (m.URL)
                        titleText += '\n<font size="2" color="87cefa">' + 'Processor: ' + m.processor + '</font>';
                        
                    var metadataTitle = new showtime.RichText(name_final_color + titleText);

                    switch (m.type) {
                        case "image":
                            page.appendItem(link,"image", {title: new showtime.RichText(name_final_color), icon: icon});
                            break;
                        case "audio":
                            page.appendItem(link,"audio", {title: new showtime.RichText(name_final_color), icon: icon});
                            break;
                        case "video":
                            if (link.indexOf('youtube.com') != -1) {
                                var regex = new RegExp("youtu(?:\.be|be\.com)/(?:.*v(?:/|=)|(?:.*/)?)([a-zA-Z0-9-_]+)");
                                var id = regex.exec(m.URL);

                                page.appendItem('youtube:video:simple:' + escape(m.name) + ":" + escape(id[1]),"directory", {
                                    title: metadataTitle, icon: icon});
                            }
                            else if (service.advanced != "1") {
                                page.appendItem(PREFIX + ':video:' + escape(m.name) + ":" + escape(link) + ":" + escape(m.processor),"video", {
                                    title: metadataTitle, 
                                    icon: icon,
                                    description: m.description
                                });
                            }
                            else {
                                page.appendItem(PREFIX + ':videoscreen:' + i,"video", {
                                    title: metadataTitle, 
                                    icon: icon,
                                    description: m.description,
                                    year: 2011
                                });
                            }
                            break;
                        case "text":
                            page.appendItem(PREFIX + ':text:' + escape(m.name) + ':' + escape(m.URL),"directory", {
                                title: new showtime.RichText(name_final_color), icon: icon});
                            break;
                        default:
                            page.appendItem(PREFIX + ':playlist:' + playlist_link,"directory", {
                                title: new showtime.RichText(name_final_color),
                                icon: icon
                            });
                            break;
							
                    }
                }
            }
        }

        this.getPlEntryThumb = function(mediaitem)
        {
            var type = mediaitem.GetType();   
		
            //some types are overruled.
            if (type.slice(0,3) == 'rss')
                type = 'rss';
            else if (type.slice(0,4) == 'atom')
                type = 'rss';
            else if (type.slice(0,3) == 'xml')
                type = 'playlist';
            else if (type.slice(0,4) == 'opml')
                type = 'playlist';
            else if (type.slice(0,6) == 'search')
                type = 'search';            
            else if (type == 'directory')
                type = 'playlist';
            else if (type == 'window')
                type = 'playlist';              
				
            //if the thumb attribute has been set then use this for the thumb.
            if (mediaitem.thumb != 'default')
                var URL = mediaitem.thumb;
			
            return URL;
        }   
    }

    function Processor(mediaitem) {
        this.verbose = 3;
        this.NIPL = new NIPL(mediaitem);
        this.downloader = new Downloader(this);
        this.haveVideoUrl = false;
        this.error = false;
        this.message = '';

        this.phase = 1;

        var init = new Date();

        this.concat = function(line) {
            var regex = new RegExp('([^ ]+)[ ]([^ ]+)[ =](.+)');
            var params = regex.exec(line);

            var key = params[2];
            var value = params[3];
            var append = true;

            showtime.trace('Proc debug concat:');
            showtime.print('old: ' + this.NIPL.vars[key]);
        
            if (value[0] == "'") {
                value = value.slice(1);
            }
            else {
                value = this.getVariableValue(value);
            }

            this.NIPL.setValue(key, value, append);

            showtime.print('new: ' + this.NIPL.vars[key]);
        }

        // From NP's Megaviewer
        this.countdown = function(line) { 
            var regex = new RegExp('([^ ]+)[ ](.+)');
            var params = regex.exec(line);

            var time = params[2];
            if (time[0] === "'")
                time = time.slice(1);

            showtime.print('Loading video...');
            for (var j = 0; j < parseInt(time); j++){
                showtime.print('Waiting ' + (time-j) + ' seconds');
                showtime.sleep(1000);
            }
        }

        this.debug = function(line) { 
            var params = line.split(' ');

            showtime.print(params[1] + ': ' + this.getVariableValue(params[1]));
        }

        this.error = function(line) { 
            var regex = new RegExp('([^ ]+)[ ](.+)');
            var params = regex.exec(line);

            var error = params[2];
            if (error[0] == "'")
                error = error.slice(1);

            var end = new Date();
            var time = end - init;

            showtime.trace('Processor error: ' + error + ' (' + time + 'ms)');
            this.error = true;
            this.message = 'Processor error: ' + error + ' (' + time + 'ms)';

            store.add_report_processor(mediaitem.URL, mediaitem.processor, error);
        }

        this.escape = function(line) { 
            var params = line.split(' ');

            this.NIPL.vars[params[1]] = escape(this.NIPL.vars[params[1]]);
        }

        this.match = function(line) { 
            for (var v in this.NIPL.vars) {
                if (v && typeof v == 'string' && v[0] === 'v' && !isNaN(parseInt(v.slice(1)))) {
                    delete this.NIPL.vars[v];
                }
            }

            if (!this.NIPL.vars['regex'])
                return -1;

            var params = line.split(' ');
            var key = params[1];

            var regex = this.NIPL.vars['regex'];
            var match = null;

            var switches = 'm';
            var value = this.getVariableValue(key);

            if (regex.search(/^\(\?([gmsi]+)\)/) == 0) {
                switches = RegExp.$1;
                regex = regex.replace(/^\(\?[gmsi]+\)/,'');
            }
            if(switches.match(/s/)){
                switches=switches.replace(/s/,'');
                regex = regex.replace(/\\n/g,'\\s');
                value = value.replace(/\n/g," ");
            }
        
            regex = new RegExp(regex, switches);
        
            match = regex.exec(value);

            if (!match)
                this.NIPL.vars.nomatch = '1';
            else {
                var i = 1;
                for (var q = 1; q < match.length; q++) {
                    this.NIPL.setValue('v' + i, match[q]);
                    i++;
                }

                delete this.NIPL.vars['nomatch'];
            }

            if (match)
                showtime.trace('Processor match ' + key + ':');
            else
                showtime.trace('Processor match ' + key + ':' + ' no match');

            for (var v in this.NIPL.vars) {
                if (v && typeof v == 'string' && v[0] === 'v' && parseInt(v.slice(1)) != NaN) {
                    showtime.print(v + '=' + this.NIPL.vars[v]);
                }
            }

            this.NIPL.vars['regex'] = undefined;

            return 0;
        }

        this.play = function() { 
            this.NIPL.vars['videoUrl'] = this.NIPL.vars.url;

            if (this.NIPL.vars['playpath']>'' || this.NIPL.vars['swfplayer']>'') {
                this.NIPL.vars.videoUrl += ' tcUrl='+this.NIPL.vars['url'];
                if (this.NIPL.vars['app']>'')
                    this.NIPL.vars.videoUrl += ' app='+this.NIPL.vars['app'];
                if (this.NIPL.vars['playpath']>'')
                    this.NIPL.vars.videoUrl += ' playpath='+this.NIPL.vars['playpath'];
                if (this.NIPL.vars['swfplayer']>'')
                    this.NIPL.vars.videoUrl += ' swfUrl='+this.NIPL.vars['swfplayer'];
                if (this.NIPL.vars['pageurl']>'')
                    this.NIPL.vars.videoUrl += ' pageUrl='+this.NIPL.vars['pageurl'];
                if (this.NIPL.vars['swfVfy']>'')
                    this.NIPL.vars.videoUrl += ' swfVfy='+this.NIPL.vars['swfVfy'];
            }

            showtime.trace('Processor final result:');
            showtime.print('URL: ' + this.NIPL.vars['videoUrl']);

            this.haveVideoUrl = true;

            this.NIPL.vars['videoUrl'] = this.NIPL.vars['videoUrl'].replace(/\//, '/');

            var end = new Date();
            var time = end - init;

            return {
                error: false,
                message: 'Video succesfully processed' + ' (' + time + 'ms)',
                video: this.NIPL.vars['videoUrl']
            }
        }

        this.print = function(line) {
            var params = line.split(' ');
            if (params.length === 2) {
                if (params[1] == 'htmRaw')
                    return;
                this.debug('debug ' + params[1]);
            }
            else {
                var regex = new RegExp('([^ ]+)[ ](.+)');
                var params = regex.exec(line);

                showtime.print(params[2].slice(1));
            }
        }

        this.replace = function(line) { 
            if (!this.NIPL.vars['regex'])
                return -1;

            var regex = new RegExp('([^ ]+)[ ]([^ ]+)[ ](.+)');
            var params = regex.exec(line);

            var key = params[2];
            var value = params[3];
            if (value[0] == "'")
                value = value.slice(1);
            else {
                value = this.NIPL.vars[value];
            }

            var regex_match = new RegExp(this.NIPL.vars['regex'], "g");

            showtime.trace('Proc debug replace src:');
            showtime.print('key: ' + key + '\nregex: ' + regex_match + '\nvalue: ' + value);
            showtime.print('old: ' + this.getVariableValue(key));

            if (!this.NIPL.vars[key])
                this.NIPL.vars[key]  = "";
            this.NIPL.vars[key] = this.NIPL.vars[key].replace(regex_match, value);

            showtime.print('new: ' + this.getVariableValue(key));

            this.NIPL.vars['regex'] = "";

            return 0;
        }

        this.report = function(page) {
            var args = {
                'phase': this.phase
            };

            showtime.trace('Processor report:');
            showtime.print('phase: ' + this.phase);
            for (var v in this.NIPL.vars) {
                if (v && typeof v == 'string' && v[0] === 'v' && parseInt(v.slice(1)) != NaN) {
                    //showtime.print(v + ': ' + this.NIPL.vars[v]);
                    args[v] = this.NIPL.vars[v];
                }
            }
            for (var el in this.NIPL.vars.reports) {
                //showtime.print(el + ': ' + this.NIPL.vars.reports[el]);
                args[el] = this.NIPL.vars.reports[el];
            }

            this.phase += 1;

            showtime.trace('Processor: phase ' + this.phase + ' learn');
            return this.getUrl(page, mediaitem, args);
        };
    
        this.report_val = function(line) { 
            var regex = new RegExp('^([^=]+)[=](.+)');
            var params = regex.exec(line);

            var key = params[1].split(' ')[1];
            var value = params[2];
            if (value[0] === "'")
                value = value.slice(1);
            else {
                value = this.NIPL.vars[value];
            }

            this.NIPL.vars.reports[key] = value;

            showtime.trace('Processor debug report value: ' + key + ' set to string literal');
            showtime.print(this.NIPL.vars.reports[key]);
        }
    
        this.scrape = function() {
            if (this.NIPL.vars['s_url'] == '') {
                this.error("error 'no scrape URL defined");
                return;
            }

            var downloader = new Downloader(this);
            downloader.controls.debug = false;

            if (this.NIPL.vars['s_action'] == 'geturl') {
                this.NIPL.vars['s_action'] = 'get';
                this.NIPL.vars['s_method'] = 'geturl';
            }

            if (this.NIPL.vars['s_method'] == 'geturl' || this.NIPL.vars['s_action'] == 'headers') {
                downloader.controls.headRequest = true;
                downloader.controls.noFollow = true;
            }

            var data = downloader.getRemote(this.NIPL.vars['s_url']);
        
            //showtime.print(data.response);
            this.NIPL.vars['htmRaw'] = data.response;

            if (this.NIPL.vars['s_method'] != 'geturl' && this.NIPL.vars['s_action'] != 'headers') {
                showtime.trace('Processor debug headers:');
                for (var hdr in data.headers) {
                    showtime.print(hdr + ': ' + data.headers[hdr]);
                    this.NIPL.vars.headers[hdr] = data.headers[hdr];
                }

                showtime.trace('Processor debug cookies:');
                if (data.multiheaders['Set-Cookie']) {
                    for (var hdr in data.multiheaders['Set-Cookie']) {
                        var header = data.multiheaders['Set-Cookie'][hdr].toString();
                        header = header.slice(0, header.toString().indexOf(';'));

                        if (header > '') {
                            var params = header.split('=');
                            var key = params[0];
                            var value = params[1];
                            this.NIPL.vars['cookies'][key] = value;
                            showtime.print(key + ': ' + value);
                        }
                    }
                }

                if (this.NIPL.vars['regex'] != '') {
                    showtime.trace('Processor scrape:');
                    this.match('match htmRaw');

                    if (this.NIPL.vars['nomatch'] && this.NIPL.vars['nomatch'] == '1')
                        showtime.print('no match');
                }
            }
            else if (this.NIPL.vars['s_method'] == 'geturl' && this.NIPL.vars['s_action'] != 'headers') {
                if (data.headers['Location'] && data.headers['Location'] != '') {
                    this.NIPL.vars['geturl'] = data.headers['Location'];
                    this.NIPL.vars['v1'] = data.headers['Location'];
                }
                else {
                    this.NIPL.vars['geturl'] = this.NIPL.vars['s_url'];
                    this.NIPL.vars['v1'] = this.NIPL.vars['s_url'];
                }
            }
            else if (this.NIPL.vars['s_action'] == 'headers') {
                for (var hdr in data.headers) {
                    showtime.print(hdr + ': ' + data.headers[hdr]);
                    this.NIPL.vars.headers[hdr] = data.headers[hdr];
                }

                showtime.trace('Processor debug cookies:');
                if (data.multiheaders['Set-Cookie']) {
                    for (var hdr in data.multiheaders['Set-Cookie']) {
                        var header = data.multiheaders['Set-Cookie'][hdr].toString();
                        header = header.slice(0, header.toString().indexOf(';'));

                        if (header > '') {
                            var params = header.split('=');
                            var key = params[0];
                            var value = params[1];
                            this.NIPL.vars['cookies'][key] = value;
                            showtime.print(key + ': ' + value);
                        }
                    }
                }
            }

            for (var v in this.NIPL.vars) {
                if (v && typeof v == 'string' && v[0] === 'v' && parseInt(v.slice(1)) != NaN) {
                    this.report_val("report_val " + v + "='" + this.NIPL.vars[v]);
                }
            }

            this.NIPL.vars['s_referer'] = '';
            this.NIPL.vars['s_cookie'] = '';
            //this.NIPL.vars['s_headers'] = {};
            this.NIPL.vars['s_postdata'] = '';
            this.NIPL.vars['s_method'] = 'get';
            this.NIPL.vars['s_action'] = 'read';
        }
    
        this.unescape = function(line) { 
            var params = line.split(' ');

            showtime.trace('Proc debug unescape:');
            showtime.print('old: ' + this.NIPL.vars[params[1]]);

            this.NIPL.vars[params[1]] = unescape(this.NIPL.vars[params[1]]);

            showtime.print('new: ' + this.NIPL.vars[params[1]]);
        }
    
        this.verbose = function(line) { 
            var params = line.split(' ');

            this.verbose = parseInt(params[1]);
        }

        this.ifResult = function(line) { 
            // condition parser
            var ifparse=new RegExp(/^([^<>=!]+)\s*([!<>=]+)\s*(.+)$/);
            var params = ifparse.exec(line);

            if (params && params[2] && params[2] != '!') {
                var key = params[1].slice(params[1].indexOf(' ') + 1);
                var keys = '';
                var value = params[3];
                var result = false;

                if (value[0] == "'")
                    value = value.slice(1);
                else
                    value = this.NIPL.vars[value];

                var oper = params[2];
                if (oper === '=')
                    oper = '==';

                if (oper === '<>')
                    oper = '!=';

                var els = key.split('.');
                if (els.length > 1) {
                    keys = "['";
                    for (var i = 0; i < els.length; i++) {
                        var el = els[i];
                        keys += el + "']";
                        if (i < els.length - 1)
                            keys += "['";
                    }

                    result = eval("this.NIPL.vars" + keys + oper + "'" + value + "'");
                }
                else {
                    if (!this.NIPL.vars[key])
                        this.NIPL.vars[key] = "";

                    result = eval("this.NIPL.vars['" + key + "']" + oper + "'" + value + "'");
                }

                showtime.trace('Proc debug if => ' + result + ':');
                showtime.print('test: ' + key + ' ' + oper + ' ' + params[3]);
                if (this.NIPL.vars[key]) {
                    showtime.print('left: ' + this.NIPL.vars[key]);
                    showtime.print('right: ' + value);
                }
            }
            else {
                var params = line.split(' ');
                var exist = false;
                if (this.NIPL.vars[params[1]])
                    exist = true;

                result = exist;

                showtime.trace('Proc debug if => ' + result + ':');
                if (this.NIPL.vars[params[1]])
                    showtime.print(params[1] + " > '': " + this.NIPL.vars[params[1]]);
                else
                    showtime.print(params[1] + " = ''");
            }

            return result;
        }

        this.getVariableValue = function(key) {
            try {
                var keys = "['" + key + "']";
                if (key.indexOf('.') != -1) {
                    keys = '';
                    for each (var k in key.split('.')) {
                    keys +="['" + k + "']";
                    }
                }

                var value = eval('this.NIPL.vars' + keys);
                return value;
            }
            catch(ex) { return ''; }
        };

        this.setVariableValue = function(line) { 
            var regex = new RegExp('^([^=]+)([=])(.+)');
            var params = regex.exec(line);

            var key = params[1];
            var value = params[3];

            if (value[0] == "'") {
                value = value.slice(1);

                showtime.trace('Proc debug variable: ' + key + ' set to string literal');
                showtime.print(value);
            }
            else {
                showtime.trace('Proc debug variable: ' + key +' set to ' + value);

                if (!this.NIPL.vars[value])
                    this.NIPL.vars[value] = '';
                showtime.print(this.NIPL.vars[value]);
                value = this.NIPL.vars[value];
            }

            this.NIPL.setValue(key, value);
        }

        this.getUrl = function(page, mediaitem, args) {
            var message = '';

            var if_result = false;
            var if_init = false;
            var if_end = false;
            var if_satisfied = false;

            var link = mediaitem.processor + '?';

            var postdata = 'url=' + escape(mediaitem.URL);

            if (args) {
                for (var el in args) {
                    if (el == 'phase') postdata += '&' + el + '=' + this.phase;
                    else postdata += '&' + el + '=' + escape(args[el]);
                }
            }

            link += postdata;
            showtime.print(link);
            this.NIPL.vars['s_postdata'] = postdata;

            if (this.phase > 1)
                this.NIPL.vars['s_method'] = 'post';

            var data = this.downloader.getRemote(link, args);

            if (data.error || data.response == '') {
                var end = new Date();
                var time = end - init;

                if (data.error) {
                    message = ex + ' (' + time + 'ms)';
                }
                if (data.response == '') {
                    message = 'The processor for this video is empty' + ' (' + time + 'ms)';
                }

                var result = {
                    error: true,
                    message: message
                };
                return result;
            }

            data = data.response;

            if (this.phase == 1) {
                var version = data.slice(0, 2);
                showtime.trace('Processor: phase 1 - query');
                showtime.print('URL: ' + mediaitem.URL);
                showtime.print('Processor: ' + mediaitem.processor);
            }

            if (this.phase > 1 || version == "v2") {
                var lines = data.split('\n');

                for (var i = 0; i < lines.length; i++) {
                    if (this.haveVideoUrl && !this.error) {
                        break;
                    }
                    else if (this.error && this.message != '') {
                        break;
                    }

                    var line = lines[i].replace(/^\s*/, '').replace(/\s\s*$/, '');
                    if (line.slice(0,1) == '#' || line.slice(0,2) == '//' || line == '')
                        continue;

                    showtime.trace('Processor Line #' + i + ': ' + line);

                    var lparse=new RegExp('^([^ =]+)([ =])(.+)');
                    var match = lparse.exec(line);

                    if (if_init && if_satisfied && line != 'endif')
                        continue;
                    if (if_init && !if_result && !if_end && line != 'else' && line != 'endif' && line.indexOf('elseif') == -1) {
                        continue;
                    }
                    else if (line == 'endif') {
                        if_init = false;
                        if_end = false;
                        if_result = false;
                        if_satisfied = false;
                    }
                    else if (line == 'else' && !if_result) {
                        showtime.trace('Proc debug else: executing');
                        if_result = true;
                    }
                    else if (line == 'else' || line.indexOf('elseif') != -1 && if_result && if_init) {
                        if_satisfied = true;
                        continue;
                    }

                    if (match && match[2] === "=") {
                        this.setVariableValue(line);
                    }
                    else if (match && match[2] === " ") {
                        if (match[1] == 'concat') {
                            this.concat(line);
                        }
                        else if (match[1] == 'debug') {
                            this.debug(line);
                        }
                        else if (match[1] == 'countdown') {
                            this.countdown(line);
                        }
                        else if (match[1] == 'error') {
                            this.error(line);
                        }
                        else if (match[1] == 'escape') {
                            this.escape(line);
                        }
                        else if (match[1] == 'debug') {
                            this.debug(line);
                        }
                        else if (match[1] == 'match') {
                            this.match(line);
                        }
                        else if (match[1] == 'print') {
                            this.print(line);
                        }
                        else if (match[1] == 'report_val') {
                            this.report_val(line);
                        }
                        else if (match[1] == 'replace') {
                            this.replace(line);
                        }
                        else if (match[1] == 'unescape') {
                            this.unescape(line);
                        }
                        else if (match[1] == 'verbose') {
                            this.verbose(line);
                        }
                        else if (match[1] === 'if' || match[1] === 'elseif') {
                            var result = this.ifResult(line);
                            if_init = true;
                            if_result = result;
                        }
                        else {
                            showtime.trace('Processor: Unknown function');
                        }
                    }
                    else if (line.indexOf(' ') == -1) {
                        if (line.slice(0, 7) == 'report') {
                            return this.report(page);
                        }
                        else if (line.slice(0,4) == 'play') {
                            return this.play();
                        }
                        if (line.slice(0,6) == 'scrape') {
                            this.scrape();
                        }
                    }
                }
            }
            else {
                // proc v1

                var result = {
                    error: false,
                    message: ''
                };

                var arr = data.split('\n');
                if (arr.length < 1) {
                    result.error = true;
                    result.message = "Processor error: nothing returned from learning phase";
                    return result;
                }
                var URL = arr[0];
                if (URL.indexOf('error') != -1) {
                    result.error = true;
                    result.message = "Processor: " + URL;
                    return result;
                }
                report = "Processor: phase 2 - instruct\n URL: " + URL;
                if (arr.length < 2) {
                    this.NIPL.vars['videoUrl'] = URL;
                    result.error = false;
                    result.message = "Processor: single-line processor stage 1 result\n playing " + URL;
                    result.video = this.NIPL.vars['videoUrl'];

                    return result;
                }
                var filt = arr[1];
                report = report + "\n filter: " + filt;
                if (arr.length > 2) {
                    var ref = arr[2];
                    var report = report + "\n referer: " + ref;
                }
                else
                    ref = '';
                if (arr.length > 3) {
                    var cookie = arr[3];
                    report = report + "\n cookie: " + cookie;
                }
                else
                    cookie='';

                showtime.trace(report);
                this.NIPL.vars['s_cookie'] = cookie;
                this.NIPL.vars['s_referer'] = ref;
                var htm = this.downloader.getRemote(URL).response;
                if (htm == '') {
                    result.error = true;
                    result.message = "Processor error: nothing returned from scrape";
                    return result;
                }

                var p = new RegExp(filt);
                var match = p.exec(htm);
                if (match) {
                    var tgt = mediaitem.processor;
                    var sep = '?';
                    report = 'Processor: phase 3 - scrape and report';
                    /*for i in range(1,len(match.groups())+1):
                    val=urllib.quote_plus(match.group(i))*/

                    for (i in match) {
                        var val = escape(match[i]);

                        tgt = tgt + sep + 'v' + i + '=' + val;
                        sep = '&';
                        report = report + "\n v" + i + ": " + val;
                    }
                    showtime.trace(report);
                    var htmRaw2 = this.downloader.getRemote(tgt).response;
                    if (htmRaw2<='') {
                        result.error = true;
                        result.message = "Processor error: could not retrieve data from process phase";
                        return result;
                    }
                    arr = htmRaw2.split('\n');
                    mediaitem.URL = arr[0];

                    if (arr[0].indexOf('error') != -1) {
                        result.error = true;
                        result.message = "Processor: " + arr[0];
                        return result;
                    }
                    if (arr.length > 1) {
                        mediaitem.URL = mediaitem.URL + ' tcUrl=' + arr[0] + ' swfUrl=' + arr[1];
                        if (arr.lenght > 2)
                            mediaitem.URL = mediaitem.URL + ' playpath=' + arr[2];
                        if (arr.length > 3)
                            mediaitem.URL = mediaitem.URL + ' pageUrl=' + arr[3];
                    }
                    mediaitem.processor = '';
                }
                else {
                    result.error = true;
                    result.message = "Processor error: pattern not found in scraped data";
                    return result;
                }
            }

            var end = new Date();
            var time = end - init;

            if (!this.NIPL.vars['videoUrl'] && this.message == '') {
                this.error = true;
                message = 'Finished processing but there are no results...' + ' (' + time + 'ms)';
            }
            else if (this.message != '') {
                this.error = true;
                message = this.message;
            }
            else
                message = 'Video succesfully processed' + ' (' + time + 'ms)';

            var result = {
                error: this.error,
                message: message,
                video: this.NIPL.vars['videoUrl']
            };

            return result;
        }
    }

    function Downloader(processor) {
        this.controls = {
            'noFollow': false,
            'debug': false,
            'headRequest': false
        };

        this.getRemote = function (filename, args) {
            var argsVar = {};
            if (args)
                argsVar = args;
            var headers = {};

            if (processor) {
                if (processor.NIPL.vars['s_agent']) {
                    headers['User-Agent'] = processor.NIPL.vars['s_agent'];
                }
                if (processor.NIPL.vars['s_referer'] && processor.NIPL.vars['s_referer'] != '') {
                    headers['Referer'] = processor.NIPL.vars['s_referer'];
                }
                if (processor.NIPL.vars['s_cookie'] && processor.NIPL.vars['s_cookie'] != '') {
                    headers['Cookie'] = processor.NIPL.vars['s_cookie'];
                }
                if (processor.NIPL.vars['s_headers'].length > 0) {
                    for (var hdr in processor.NIPL.vars['s_headers'])
                        headers[hdr] = processor.NIPL.vars['s_headers'][hdr];
                }
            }

            var data = '';

            if (processor) {
                showtime.trace('Processor ' + processor.NIPL.vars['s_method'].toString().toUpperCase() + '.' + processor.NIPL.vars['s_action'] + ': ' + filename);
                showtime.trace('Proc debug remote args:');
                showtime.trace("{'postdata': \'" + processor.NIPL.vars['s_postdata'] + "\', 'agent': '" + headers['User-Agent'] + "', 'headers': {}, 'cookie': '" + headers['Cookie'] + "', 'action': '" + 
                processor.NIPL.vars['s_action'] + "', 'referer': '" + headers['Referer'] + "', 'method': '" + processor.NIPL.vars['s_method'] + "'}");
            }

            try {
                if (processor && processor.NIPL.vars['s_method'] === 'get') {
                    data = showtime.httpGet(filename, argsVar, headers, this.controls);
                }
                else if (processor && processor.NIPL.vars['s_method'] === 'post' && processor.NIPL.vars['s_postdata']) {
                    var arguments = {};
                    var params = processor.NIPL.vars['s_postdata'].split('&');
                    for (var i in params) {
                        var el = params[i];
                        var params_sub = el.split('=');

                        if (!params_sub[1])
                            params_sub[1] = '';

                        showtime.print(params_sub[0] + ': ' + unescape(params_sub[1]));
                        arguments[params_sub[0]] = unescape(params_sub[1]);
                    }

                    data = showtime.httpPost(filename, arguments, null, headers, this.controls);
                }
                else if (processor && processor.NIPL.vars['s_method'] === 'post' && !processor.NIPL.vars['s_postdata']) {
                    data = showtime.httpPost(filename, argsVar, headers, this.controls);
                }
                else
                    data = showtime.httpGet(filename, argsVar, headers, this.controls);

                var response = data.toString();
                var headersResponse = data.headers;

                return {
                    'response': response,
                    'headers': headersResponse,
                    'multiheaders': data.multiheaders
                };
            }
            catch (ex) {
                showtime.trace('Downloader: ' +ex);
                return {
                    'response': '',
                    'headers': {},
                    'multiheaders': {},
                    'error': ex
                };
            }
        };
    }

    function MediaItem() 
    {
        this.type='unknown'; //(required) type (playlist, image, video, audio, text)
        this.version=8; //(optional) playlist version
        this.name=''; //(required) name as displayed in list view
        this.description=''; //(optional) description of this item
        this.date=''; //(optional) release date of this item (yyyy-mm-dd)
        this.thumb='default'; //(optional) URL to thumb image or 'default'
        this.icon='default'; //(optional) URL to icon image or 'default'
        this.URL=''; //(required) URL to playlist entry
        //this.DLloc=''; //(optional) Download location
        this.processor=''; //(optional) URL to mediaitem processing server
        this.playpath=''; //(optional) 
        this.swfplayer=''; //(optional)
        this.pageurl=''; //(optional)
        this.background='default'; //(optional) background image
        this.rating=''; //(optional) rating value
        this.infotag='';
        this.view='default'; //(optional) List view option (list, panel)
	
        this.GetType = function(field)
        {
            var index = this.type.indexOf(':');
            var value = '';
            if (index != -1)
            {
                if (field == 0)
                    value = this.type.slice(0,index);
                else if (field == 1)
                    value = this.type.slice(index+1, this.type.length);
            }
            else
            {
                if (field == 0)
                    value = this.type;
                else if (field == 1)
                    value = '';
            }
            return value;
        }
    }

    function NIPL(mediaitem) {
        this.vars = {};

        this.setValue = function(key, value, append) {
            if (!append || !this.vars[key])
                this.vars[key] = value;
            else
                this.vars[key] += value;
        };

        this.newVars = function(mediaitem) {
            this.vars = {
                // Scraping parameters (remote site data retrieval)
                's_url': mediaitem.URL,
                's_method': 'get', // get or post
                's_action': 'read', // read or headers
                's_agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.0.4) Gecko/2008102920 Firefox/3.0.4', // User Agent of a web browser (e.g. Firefox)
                's_referer': '',
                's_cookie': '',
                's_postdata': '', //only if s_method == 'post'
                's_headers': {},

                // Scrape return data (auto-defined from calling the scrape function)
                'htmRaw': '', // only if s_action == 'read'
                'geturl': '', 
                'headers': {},
                'cookies': {},

                // Video Playback
                'url': '',
                'swfplayer': '',
                'playpath': '',
                'pageurl': '',
                'app': '',
                'swfVfy': '',
                'live': '',
                'agent': '', //?
                'referer': '',

                //'cacheable': '', // Not supported in Showtime
                'countdown_caption': '',
                'countdown_title': '',
                'nookies': {}, // NIPL cookies
                //'nookie_expires': '', // Not supported in Showtime
                'regex': '',
                'nomatch': 0
                //v1,v2,...,vn
            };

            this.vars.reports = {};
        }

        this.newVars(mediaitem);
    }

    function Server() {
        this.credentials = {};
        this.user_id = '';
        this.favorites_id = '';
        this.history_id = '';

        this.authenticated = function() {
            if (this.user_id != '')
                return true;
            return false;
        };

        this.login = function() {
            if(this.authenticated())      
                return true;
                
            var reason = "Login required";    
            var do_query = false;    
            while(1) { 
                this.credentials = plugin.getAuthCredentials("Navi-X", reason, do_query); 

                if(!this.credentials) {	
                    if(!do_query) {	  
                        do_query = true;	  
                        continue;
                    }	
                    return "No credentials";      
                }      

                if(this.credentials.rejected)	
                    return "Rejected by user";   

                try {
                    var v = showtime.httpPost("http://www.navixtreme.com/members/", {
                        'action':'takelogin', 
                        'ajax':'1', 
                        'username':this.credentials.username,
                        'password':this.credentials.password, 
                        'rndval':new Date().getTime()
                    });     
            
                    var lines = v.toString().split("\n");

                    if (lines[0] === 'ok') {
                        this.cookie = "l_access=" + lines[1] + "; l_attempt=" + lines[2] + "; ";

                        if (v.headers["Set-Cookie"])
                            this.user_id = v.headers["Set-Cookie"].slice(5, v.headers["Set-Cookie"].indexOf(";"));
                        
                        if(!this.user_id) {	
                            reason = 'Login failed, try again';	
                            continue;      
                        }      
                        
                        this.cookie += v.headers["Set-Cookie"].slice(0, v.headers["Set-Cookie"].indexOf(";"));
                        
                        showtime.trace('Logged in to Navi-X as user: ' + this.credentials.username);

                        // Sync IP with Navi-X server
                        this.ipsync();

                        // Enable/Disable Adult Content
                        this.AdultContent(); 

                        // Get ID of Favorite playlist for this user
                        this.getPlaylistId("Favorites", true);

                        // Get ID of History playlist for this user
                        this.getPlaylistId("History", true);

                        return false; 
                    }
                    else if (lines[0] === 'invalid')
                        continue;
                }
                catch (ex) { showtime.trace('Navixtreme: Could not log in to the website.'); return -1; }
            }
        };

        this.AdultContent = function() {
            try {
                var value = '1';
                if (service.adult == false)
                    value = '0';

                var v = showtime.httpPost("http://www.navixtreme.com/members", {
                    'action':'adult_toggle', 
                    'value':value
                }, null, {
                    'cookie' : this.cookie
                });
                showtime.trace('Navixtreme: ' + v);
            }
            catch(ex) { showtime.trace('Navixtreme: Couldn\'t enable adult content.'); }
        }

        this.ipsync = function() {
            var v = showtime.httpPost("http://www.navixtreme.com/members/", {
                'action':'ipsync', 
                'rndval':new Date().getTime()
            }, null, {
                'cookie' : this.cookie
            });

            if (v.toString() == 'ok') {
                showtime.trace('Navixtreme: IP synced succesfully');
            }
        }

        this.existInPlaylist = function(item, playlist_name) {
            var playlist_id = this.getPlaylistId(playlist_name);
            var playlist_url = 'http://www.navixtreme.com/playlist/' + playlist_id + '/' + playlist_name + '.plx';

            var playlist = new Playlist(null, playlist_url, new MediaItem());
            playlist.render = false;
            playlist.loadPlaylist(playlist_url);

            showtime.trace('Navixtreme: Looking for item #' + item.id + ' in playlist ' + playlist_name + '.');
        
            if (item.processor === '')
                item.processor = 'undefined';

            if (item.type == 'plx' || item.type == 'unknown')
                item.type = 'playlist';

            var exist = false;
            for (var i in playlist.list) {
                var it = playlist.list[i];
                if (item.type == 'video') {
                    if (it.URL === item.URL && it.processor === item.processor) {
                        exist = true;
                    }
                }
                else {
                    if (it.type === item.type && it.URL === item.URL) {
                        exist = true;
                    }
                }

                if (exist) {
                    showtime.trace('NAVI-X: Found the entry in the playlist ' + playlist_name + '.');
                    return exist;
                }
            }

            showtime.trace('NAVI-X: This entry was not found in the playlist ' + playlist_name + '.');
            return false;
        };

        this.removeFromPlaylist = function(playlist_name, item) {
            var playlist_id = this.getPlaylistId(playlist_name);
            var playlist_url = 'http://www.navixtreme.com/playlist/' + playlist_id + '/' + playlist_name + '.plx';

            var playlist = new Playlist(null, playlist_url, new MediaItem());
            playlist.render = false;
            playlist.loadPlaylist(playlist_url);

            var id = this.getIndexOfIteminPlaylist(playlist, item);

            if (id == -1)
                return false;

            var result = showtime.httpPost('http://www.navixtreme.com/mylists/',{
                'action': 'item_delete',
                'id': playlist.list[id].id,
                'rndval':parseInt(new Date().getTime())
            }, null, {
                'cookie' : this.cookie
            }).toString();
                
            if (result.split("\n")[0] == 'ok') {
                showtime.trace('Navixtreme: Item was succesfully removed from playlist ' + playlist_name + '.');
                return true;
            }
            else {
                showtime.trace('Navixtreme: ERROR - ' + result);
                return false;
            }
        };

        this.getIndexOfIteminPlaylist = function(playlist, item) {
            if (item.type == 'plx' || item.type == 'unknown')
                item.type = 'playlist';

            for (var id in playlist.list) {
                var it = playlist.list[id];
                if (item.type == 'video') {
                    if (it.URL === item.URL && it.processor === item.processor)
                        return id;
                }
                else {
                    if (it.type === item.type && it.URL === item.URL)
                        return id;
                }
            }
            return -1;
        }

        this.addToPlaylist = function(playlist_name, item) {
            var playlist_id = '';
            if (playlist_name != 'Favorites' || playlist_name != 'History')
                playlist_id = this.getPlaylistId(playlist_name, true);
            else if (playlist_name === 'Favorites')
                playlist_id = this.favorite_id;

            if (playlist_id == '')
                return false;

            //save item
            if (item.type == 'playlist' || item.type == 'unknown')
                item.type = 'plx';

            if (playlist.list.length > 1) {
                for (var i = 0; i < playlist.list.length; i++) {
                    var it = playlist.list[i];
            
                    if (it.processor === '')
                        it.processor = 'undefined';
                    if (it.URL === item.URL && it.processor === item.processor && it.thumb === item.thumb && it.description === item.description) {
                        this.removeFromPlaylist('History', it);
                    }
                }
            }
                
            var result = showtime.httpPost('http://www.navixtreme.com/mylists/',{
                'URL': item.URL,
                'action':'item_save',
                'background': item.background,
                'description': item.description,
                'list_id': playlist_id,
                'list_pos':'top',
                'name': item.name,
                'playpath': item.playpath,
                'plugin_type':'music',
                'processor': item.processor,
                'text_local':0,
                'this_list_id':'',
                'thumb': item.thumb,
                'txt':'',
                'type': item.type,
                'rndval':parseInt(new Date().getTime())
            }, null, {
                'cookie' : this.cookie
            }).toString();
                
            if (result.split("\n")[0] == 'ok') {
                showtime.trace('Navixtreme: Item was succesfully added to playlist ' + playlist_name + '.');
                return true;
            }
            else {
                showtime.trace('Navixtreme: ERROR - ' + result);
                return false;
            }
        };

        this.getPlaylistId = function(title, quiet) {
            if (title == 'History' && this.history_id != '')
                return this.history_id;
            else if (title == 'Favorites' && this.favorites_id != '')
                return this.favorites_id;

            var name = title.toLowerCase().replace(' ', '_');
            var playlist_id = '';

            var data = showtime.httpGet('http://www.navixtreme.com/playlist/mine.plx', null, {
                'cookie':this.cookie
            });

            try {
                //get playlist plx
                playlist_id = data.toString().match('playlist/(.*?)/' + name + '.plx')[1];
                showtime.trace('NAVI-X: ' + title + ' plx id: ' + playlist_id);
            }
            catch (err) {
                showtime.trace('Navixtreme: ' + err);

                var readme = false;
                if (title == 'History' || title == 'Favorites')
                    readme = true;

                if (!quiet) {
                    //playlist plx doesn't exist
                    if (showtime.message("You don't have any playlist with that name, do you want to create one?", true, true))
                        playlist_id = this.createPlaylist(title, readme);
                }
                else playlist_id = this.createPlaylist(title, readme);
            }
            this[name + '_id'] = playlist_id;
            return playlist_id;
        }

        this.createPlaylist = function(title, readme/*, description, background, logo, icon, adult*/) {
            var visibility = service.playlistsVisibility;
            if (service.playlistsVisibility)
                visibility = '1';
            else
                visibility = '0';

            if (title == 'History')
                visibility = '1';

            var name = title.toLowerCase().replace(' ', '_') + '_id';
            this[name] = playlist_id;

            var playlist_id = showtime.httpPost('http://www.navixtreme.com/mylists/', {
                'action':'list_save','background':'','description':'','icon_playlist':'','id':'','is_adult':0,'is_home':1,
                'is_private': visibility,'logo':'','player':'','title': title,'rndval':parseInt(new Date())
            }, null, {
                'cookie':this.cookie
            }).toString();

            if (readme) {
                showtime.httpPost('http://www.navixtreme.com/mylists/',{
                    'URL':'','action':'item_save','background': '','description': '','list_id': playlist_id,'list_pos':'top',
                    'name':'Navi-X Readme','player':'','playpath':'','plugin_type':'music','processor':'','text_local':1,
                    'this_list_id':'','thumb':'',
                    'txt': 'Thank you for using Navi-X.\n\n'+
                                'Any items added will be by default stored as private and will not be visible by other users!\n\n'+
                                'You can also import and manage your favorites online using the playlist editor. See also http://www.navixtreme.com. \n\n'+
                                'Have fun using Navi-X, from Navi-X\' Showtime Plugin\' developer facanferff',
                    'type':'text','rndval':parseInt(new Date().getTime())
                }, null, {
                    'cookie':this.cookie
                });
            }

            showtime.trace('NAVI-X: ' + title + ' plx id: ' + playlist_id);
            return playlist_id;
        }
    }

    function Store() {
        this.add_report_processor = function(url, processor, error){
            if(this.exist_report_processor(url, processor))
                return;

            if(!report_processors[url])
                report_processors[url] = '';
		
            report_processors[url] = processor + ' : ' + error;
            showtime.trace('Entry succesfully reported in local store.');
        }

        this.exist_report_processor = function(url, processor){
            if(report_processors[url] && report_processors[url] == processor){
                return true;
            }else{ return false; }

        }
    }

    function TMDB() {
        this.key = "78d57cc453f9a284f483a0969ee65578";

        this.validMovieTitle = function(title) {
            var regex = new RegExp(/(.+?)\(([0-9]+?)\).*/);
            var match = regex.exec(title);

            if (!match) {
                showtime.trace('TMDB: Title not valid for a movie.');
                return null;
            }
            else {
                var t = "";
                t += match[1] + '(' + match[2] + ')';
                showtime.trace('TMDB: Title valid, ' + t);
                return t;
            }
        }

        this.searchMovie = function(title) {
            var args = {
                'api_key': this.key,
                'query': escape(title),
                'include_adult': 'true'

            };
            var data = showtime.httpGet("http://api.themoviedb.org/3/search/movie", args, {
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            });
            data = showtime.JSONDecode(data.toString());

            if (parseInt(data['total_results']) > 0) {
                showtime.trace('TMDB: Found ' + data['total_results'] +' movie entries.');
                return data.results[0];
            }
            else { 
                showtime.trace('TMDB: No movie entries found.');
                return null;
            }
        }

        this.getMovie = function(title) {
            var t =  this.validMovieTitle(title);

            if (!t)
                return null;

            var args = {
                'api_key': this.key,
                'query': title,
                'include_adult': true
            };

            var item = this.searchMovie(t);

            if (!item)
                return null;
            else {
                var id = item.id;
                var data = showtime.JSONDecode(showtime.httpGet("http://api.themoviedb.org/3/movie/" + id, {
                    'api_key': this.key
                }, {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                }).toString());

                return data;
            }
        }
    }
	
plugin.addURI(PREFIX + ":start", startPage);
})(this);
