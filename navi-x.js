/**
 * Navi-X plugin for showtime version 0.1 by facanferff (Fábio Canada / facanferff@hotmail.com)
 *
 *  Copyright (C) 2011 facanferff (Fábio Canada / facanferff@hotmail.com)
 *
 * 	ChangeLog:
 *	0.1:
 * 	- Started work
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
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/* Currently working processors:
 * - Megavideo (no bypass)
 * - VideoFriender
 * - AnimeFreak.tv
 * - MovShare
 * - StageVu
 *
 */


(function(plugin) {

  var PREFIX = "navi-x";
  
  var home_URL = 'http://www.navi-x.org/playlists/home.plx';
  var home_URL_mirror='http://navi-x.googlecode.com/svn/trunk/Playlists/home.plx';
  var page_size = 200 //display maximum 200 entries on one page
  var Version='3'; 
  var SubVersion='7';
  var plxVersion = '8';
  
  var background_image1 = plugin.path + 'resources/background1.jpg';
  
  var result = -1;
  
  var video_link = '';
  
  var nxserver_URL = 'http://navix.turner3d.net';
  
  var nxserver;
  
  var itunes      = new Namespace("http://www.itunes.com/dtds/podcast-1.0.dtd");
  var content = new Namespace("http://purl.org/rss/1.0/modules/content/")
  
//settings 

  var service = plugin.createService("Navi-X", "navi-x:start", "tv", true,
			   plugin.path + "logo.png");
                           
  var settings = plugin.createSettings("Navi-X",
					  plugin.path + "logo.png",
					 "Navi-X: Online Media Resources");

  settings.createInfo("info",
			     plugin.path + "logo.png",
			     "Navi-X. Learn more on http://website.navi-x.org/ \n" + 
				 "Plugin developed by facanferff (Fábio Canada) \n");

  settings.createBool("backgroundEnabled", "Background", false, function(v) {
    service.backgroundEnabled = v;
  });

  settings.createInt("processorDebug", "Background", 0, 0, 4, 1, '', function(v) {
    service.processorDebug = v;
  });
  
function startPage(page) {
    /*Create playlist object contains the parsed playlist data. The this.list control displays
    the content of this list*/
    this.playlist = new CPlayList();
    
    //Next a number of class private variables
    this.home=home_URL;
    this.pl_focus = this.playlist;
    this.listview = 'default';
    
    nxserver = new CServer();
    
    page.type = "directory";
    page.contents = "items";
    
    result = -1;
    
    if (result)
    {
        //Load the Navi-X home page
        result = ParsePlaylist(page, this.home, new CMediaItem(), 0, true, "CACHING");
        if (result) //failed, try the mirror home page
            result = ParsePlaylist(page, home_URL_mirror, new CMediaItem(), 0, true, "CACHING"); //mirror site 
    }
    
    page.appendItem(PREFIX+':playlist:'+'playlist:'+escape('http://navix.turner3d.net/playlist/53864/debugging_and_testing_playlist.plx'),
        'directory', {title:'Test'})
        
    page.appendItem('http://navix.turner3d.net/playlist/53864/debugging_and_testing_playlist.plx',
        'text', {title:'Test'})
    
    page.loading = false;
  }

plugin.addURI(PREFIX + ":video:(.*):(.*):(.*)", function(page, title, url, processor) {
    result = -1;
    
    var mediaitem = new CMediaItem();
    mediaitem.URL = unescape(url);
    mediaitem.processor = unescape(processor);
    
    var urlloader = new CURLLoader();
    result = urlloader.urlopen(mediaitem.URL, mediaitem);
        
    showtime.trace("Get original video link result: " + result);
        if (result) {
            page.error('There was one problem in the process, please contact the developer with the following information: \n'+
                'URL: '+mediaitem.URL + '\nProcessor: '+mediaitem.processor);
            return;
        }
    
    
    page.source = "videoparams:" + showtime.JSONEncode({      
        title: unescape(title),     
        sources: [
        {	
            url: video_link      
        }]    
    });    
    page.type = "video";
});

plugin.addURI(PREFIX + ":text:(.*)", function(page, url) {
    var content = showtime.httpGet(unescape(url)).toString();
    page.metadata.content = content
    page.type = "text";
    
    page.loading = false;
});

plugin.addURI(PREFIX + ":playlist:(.*):(.*)", function(page, type, url) {
    result = -1;
    
    page.type = "directory";
    page.contents = "items";
    
    this.playlist = new CPlayList();
    this.pl_focus = this.playlist;
    
    var mediaitem = new CMediaItem();
    mediaitem.type = type;
    mediaitem.URL = unescape(url)
    
    page.loading = false;
    
    if (type.slice(0,6) == 'search') {
        result = PlaylistSearch(page,mediaitem)
        if (result)
            return;
    }
    else
        result = ParsePlaylist(page, unescape(url), mediaitem, 0, true, "CACHING");
    showtime.trace("Parsing playlist operation result: " + result);
    if (result)
    {
        page.error('Failed to parse the playlist, please contact the developer with the following information: \n'+
                'Type: '+mediaitem.type + '\nURL: '+unescape(url));
        return;
    }
});


        /*--------------------------------------------------------------------
        # Description: Handle selection of playlist search item (e.g. Youtube)
        # Parameters : item=mediaitem
        #              append(optional)=true is playlist must be added to 
        #              history list;
        # Return     : -
        /*------------------------------------------------------------------*/
        function PlaylistSearch(page, item) {
            var search = showtime.textDialog('Search: '+item.name, true, false)
            
            if (search.rejected)
                return -1 //canceled
            var searchstring = search.input;
            if (searchstring.length == 0)
                return -1 //empty string search, cancel
            //
            //get the search type:
            var index=item.type.indexOf(":")
            var search_type;
            if (index != -1)
                search_type = item.type.slice(index+1)
            else
                search_type = ''
        
            var fn
            var mediaitem
        
            //youtube search
            if ((item.type == 'search_youtube') || (search_type == 'html_youtube')) {
                fn = searchstring.replace(/ /g,'+')
                if (item.URL != '')
                    URL = item.URL
                else
                    URL = 'http://gdata.youtube.com/feeds/base/videos?max-results=50&alt=rss&q='
                URL = URL + fn
                showtime.trace(item.URL)
                // Use for now Published sort by default
                URL = URL + '&orderby=published'
               
                mediaitem=new CMediaItem()
                mediaitem.URL = URL
                mediaitem.type = 'rss:video'
                mediaitem.name = 'search results: ' + searchstring
                mediaitem.player = item.player
                mediaitem.processor = item.processor

                this.pl_focus = this.playlist
                result = ParsePlaylist(page, mediaitem.URL, mediaitem, 0, true, 'CACHING')
            }
        
            else { //generic search
                    fn = searchstring.replace(/ /g,'+')
                    URL = item.URL
                    URL = URL + fn
//@todo:add processor support to change the URL.                       
                    mediaitem=new CMediaItem()
                    mediaitem.URL = URL
                    if (search_type != '')
                        mediaitem.type = search_type
                    else //default
                        mediaitem.type = 'playlist'
                    
                    mediaitem.name = 'search results: ' + searchstring
                    mediaitem.player = item.player
                    mediaitem.processor = item.processor
//@todo
                    this.pl_focus = this.playlist
                    result = ParsePlaylist(page, mediaitem.URL, mediaitem, 0, true, 'CACHING')
            }
            return result;
        }
             


/*--------------------------------------------------------------------
# Description: Get the file extension of a URL
# Parameters : filename=local path + file name
# Return     : the file extension Excluding the dot
/*------------------------------------------------------------------*/
function getFileExtension(filename) {
    var ext_pos = filename.lastIndexOf('.') //find last '.' in the string
    if (ext_pos != -1) {
        var ext_pos2 = filename.indexOf('?', ext_pos) //find last '.' in the string
        if (ext_pos2 != -1)
            return filename.slice(ext_pos+1,ext_pos2)
        else
            return filename.slice(ext_pos+1)
    }
    else
        return ''
}
  
/*----------------------------------------------------------------------------
        # Description: Parse playlist file. Playlist file can be a:
        #              -PLX file;
        #              -RSS v2.0 file (e.g. podcasts);
        #              -RSS daily Flick file (XML1.0);
        #              -html Youtube file;
        # Parameters : URL (optional) =URL of the playlist file.
        #              mediaitem (optional)=Playlist mediaitem containing 
        #              playlist info. Replaces URL parameter.
        #              start_index (optional) = cursor position after loading 
        #              playlist.
        #              reload (optional)= indicates if the playlist shall be 
        #              reloaded or only displayed.
        # Return     : 0 on success, -1 if failed.
        /*------------------------------------------------------------------*/
        function ParsePlaylist(page, URL, mediaitem, start_index, reload, proxy)
        {
            //avoid recursive call of this function by setting state to busy.
            //this.state_busy = 1

            /*The application contains 4 CPlayList objects:
            #(1)main list
            #Parameter 'this.pl_focus' points to the playlist in focus (1-4).*/
            var playlist = this.pl_focus;
            showtime.trace(URL)
            /*if (reload == false)
                mediaitem = this.mediaitem;*/
            
            var type = mediaitem.GetType(0);
            showtime.trace(type);
            
            if (reload == true)
            {
                //load the playlist              
                if (type.slice(0,3) == 'rss')
                    result = playlist.load_rss_20(URL, mediaitem, proxy);
                else if (type.slice(0,4) == 'atom')
                    result = playlist.load_atom_10(URL, mediaitem, proxy)
                else if (type == 'opml')
                    result = playlist.load_opml_10(URL, mediaitem, proxy)
                else //assume playlist file
                    result = playlist.load_plx(URL, mediaitem);
                
                if (result == -1) //error
                    showtime.trace("This playlist requires a newer Navi-X version", true, false);
                else if (result == -2) //error
                    showtime.trace("Cannot open file.", true, false);
                
                if (result != 0) //failure          
                    return -1
            }
            
            //succesful
/*#the next line is for used for debugging only            
#            playlist.save(RootDir + 'source.plx')*/
            
            //this.vieworder = 'ascending' //ascending by default
        
            /*if (start_index == 0)
                start_index = playlist.start_index*/
             
            this.URL = playlist.URL;
            this.type = type;
            if (URL != '')
                mediaitem.URL = URL;
            this.mediaitem = mediaitem;
            
            //#display the new URL on top of the screen
            var title = '';
            if (playlist.title.length > 0)
                title = playlist.title  + ' - (' + playlist.URL + ')';
            else
                title = playlist.URL;
            
            var title_final = "";
            var renew=0;
            page.metadata.title = title;
            var tmp_title3 = '';
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
                //showtime.trace(title_final);
                renew=1;
            }
            if (renew)
                page.metadata.title = new showtime.RichText(title_final+'<font color="#ffffff" size="2">'+tmp_title3+'</font>');
            
            //set the background image   
            if (service.backgroundEnabled == "1") {
                var m = this.playlist.background;
                if (m == "default" || m == "previous")
                    m = background_image1;
                page.metadata.background = m;
            }
                
            
            /*else if (m != 'previous') //URL to image located elsewhere
                ext = getFileExtension(m)
                loader = CFileLoader2() #file loader
                loader.load(m, imageCacheDir + "background." + ext, proxy="ENABLED", content_type='image')
                if loader.state == 0:
                    this.bg.setImage(loader.localfile)
                    this.bg1.setImage(imageDir + background_image2)*/  
            
            m = this.playlist.logo;
            page.metadata.logo = m;
            
//            playlist.view = 'thumbnails'
            showtime.trace(playlist.view);
            var newview = SetListView(playlist.view);
            page.contents = newview;
            
            /*if ((newview == 'array') && (playlist.description != ""))
                newview = this.list2;*/
            
            /*page.contents = newview;
            
            this.list = newview;
            listcontrol = newview;*/
    
            /*if newview == this.list5:
                this.page_size = 50              
            else:  
                this.page_size = 200             

            this.list2tb.controlDown(this.list)
            this.list2tb.controlUp(this.list)
            
            filter the playlist for parental control.
            this.FilterPlaylist()*/
            
            //Display the playlist page
            SelectPage(page, start_index / page_size, start_index % page_size, false); 
            
            /*
            this.loading.setVisible(0)
            listcontrol.setVisible(1)
                             
            if playlist.description != '':
                this.list2tb.reset()
                this.list2tb.setText(playlist.description)
                this.list2tb.setVisible(1)      
           
            this.state_busy = 0*/
            
            return 0 //success
        }
        
/*----------------------------------------------------------------------------
        # Description: Determines the new list view based on playlist and user
        #              configuration.
        # Parameters : listview: playlist view property in plx file
        #              mediaitemview: media entry view property in plx file
        # Return     : The new requested view
        /*------------------------------------------------------------------*/   
        function SetListView(listview)
        {
            var view, newview;
            if (this.listview == "list")
                view = "list";
            else if (this.listview == "thumbnails")
                view = "thumbnails";
            else
                view = listview;
             
            if ((view == "default") || (view == "list"))
                newview = 'items';
            else if (view == "thumbnails")
                newview = 'list';       
            else //list
                newview = 'items';           
    
            return newview;
        }
        
        
        /*--------------------------------------------------------------------
        # Description: Large playlists are splitup into pages to improve
        # performance. This function select one of the playlist pages. The
        # playlist size is defined by setting variable 'page_size'.
        # Parameters : page = page to display
        #              start_pos: cursor start position
        # Return     : -
        /*------------------------------------------------------------------*/
        function SelectPage(page, current_page, start_pos, append)
        {
            var start = new Date()
            this.state_busy = 1;
            
            var playlist = this.pl_focus;
            this.current_page = current_page;

            /*if (append == false)
            {
                //listcontrol.reset() #clear the list control view
                this.list1.reset()
                this.list2.reset()
                this.list5.reset() 
            }*/

            var today=new Date();
            var n=0;
            for (var i = current_page*page_size; i < playlist.size(); i++)
            {
                var m = playlist.list[i];    
                if (parseInt(m.version) <= parseInt(plxVersion))
                {
                    var icon = getPlEntryThumb(m)
                    
                    /*if this.list == this.list5:
                        icon = this.getPlEntryThumb(m)*/
                    
                    var label2='';
                    //if True:
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
                            var hours_past = (today.getHours()-entry_date.getHours())
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
                    
                    /*if (m.infotag != '')
                        label2 = label2 + ' ' + m.infotag;
                            
                    if (m.description != '')
                        label2 = label2 + ' >';*/
                    
                    var link = m.URL;
                    
                    var name_final_color = '';
                    var name = m.name;
                    var tmp_name3 = '';
                    var renew = 0;
                    while(name.indexOf('[COLOR=FF') != -1)
                    {
                        var color_index = name.indexOf('[COLOR=FF');
                        var color = name.slice(color_index+9, name.indexOf(']', color_index));
                        //showtime.trace(color);
                        var text = name.slice(name.indexOf(']')+1, name.indexOf('[/COLOR]'));
                        //showtime.trace(text);
                        var tmp_name1 = name.slice(0, color_index);
                        var tmp_name2 = text;
                        tmp_name3 = name.slice(name.indexOf('[/COLOR]')+8, name.length);
                        //showtime.trace(tmp_name1+tmp_name2+tmp_name3);
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
                    var playlist_link = m.type;
                    playlist_link+=":"+escape(link);
                    switch (m.type) {
                        case "image":
                            page.appendItem(link,"image", {title: new showtime.RichText(name_final_color), icon: icon});
                            break;
                        case "audio":
                            page.appendItem(link,"audio", {title: new showtime.RichText(name_final_color), icon: icon});
                            break;
                        case "video":
                            page.appendItem(PREFIX + ':video:' + escape(m.name) + ":" + escape(link) + ":" + escape(m.processor),"directory", {
                                title: new showtime.RichText(name_final_color), icon: icon});
                            break;
                        case "text":
                            page.appendItem(PREFIX + ':text:' + escape(m.URL),"directory", {
                                title: new showtime.RichText(name_final_color), icon: icon});
                            break;
                        default:
                            page.appendItem(PREFIX + ':playlist:' + playlist_link,"directory", {
                                title: new showtime.RichText(name_final_color), 
                                icon: icon
                            });
                            break;
                            
                    }
                    /*if (m.type != 'script' && m.type!='window' && m.type != 'html' &&
                        m.type != 'xml_shoutcast' && m.type != 'html_youtube' && m.type != 'directory' &&
                        m.type != 'xml_applemovie' && m.type != 'favorite') {
                        page.appendItem(PREFIX + ':playlist:' + playlist_link,"directory", {
                            title: new showtime.RichText(name_final_color), 
                            icon: icon
                        });
                    }*/
                    
                    n=n+1;
                    if (n >= this.page_size)
                        break; //m
                }
            }
            var end = new Date()
            showtime.trace("Time used to append items: "+(end-start))
        }
        
        /*--------------------------------------------------------------------
        # Description: Gets the playlist entry thumb image for different types
        # Parameters : mediaitem: item for which to retrieve the thumb
        # Return     : thumb image (local) file name
        /*------------------------------------------------------------------*/
        function getPlEntryThumb(mediaitem)
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
            else if (mediaitem.type == 'skin')
                type = 'script';                
                
            //if the thumb attribute has been set then use this for the thumb.
            if (mediaitem.thumb != 'default')
                var URL = mediaitem.thumb;
            
            return URL;
        }  
  
/*--------------------------------------------------------------------
# Description: Playlist class. Contains CMediaItem objects
/*------------------------------------------------------------------*/
function CPlayList()
{
    this.version = '0';
    this.background = 'default';
    this.logo = 'none';
    //
    this.icon_playlist = 'default';
    this.icon_rss = 'default';
    this.icon_script = 'default';
    this.icon_plugin = 'default';
    this.icon_video = 'default';
    this.icon_audio = 'default';
    this.icon_image = 'default';
    this.icon_text = 'default';
    this.icon_search = 'default';
    this.icon_download = 'default';
    //
    this.title = '';
    this.type = '';
    this.description = '';
    this.URL = '';
    this.player = 'default';
    this.playmode = 'default';
    this.view = 'default';  
    this.start_index = 0;
    this.list = [];
        
    this.add = CPlaylist_add;
    this.insert = CPlaylist_insert;
    this.clear = CPlaylist_clear;
    this.remove = CPlaylist_remove;
    this.size = CPlaylist_size;
    this.load_plx = CPlaylist_load_plx;
    this.load_rss_20 = CPlaylist_load_rss_20;
    this.load_atom_10 = CPlaylist_load_atom_10;
    this.load_opml_10 = CPlaylist_load_opml_10;
}
    
    /*--------------------------------------------------------------------
    # Description: Adds a item to playlist.
    # Parameters : item = CMediaItem obect
    # Return     : -
    /*------------------------------------------------------------------*/
    function CPlaylist_add(item)
    {
        this.list.push(item);
    }

    /*--------------------------------------------------------------------
    # Description: Insert a item to playlist.
    # Parameters : item = CMediaItem obect
    #              index=index of entry to remove
    # Return     : -
    /*------------------------------------------------------------------*/
    function CPlaylist_insert(item, index)
    {
        this.list.insert(index, item);
    }

    /*--------------------------------------------------------------------
    # Description: clears the complete playlist.
    # Parameters : -
    # Return     : -
    /*------------------------------------------------------------------*/
    function CPlaylist_clear()
    {
        this.list.splice(0, this.list.length);
    }
    
    /*--------------------------------------------------------------------
    # Description: removes a single entry from the playlist.
    # Parameters : index=index of entry to remove
    # Return     : -
    /*------------------------------------------------------------------*/
    function CPlaylist_remove(index)
    {
        this.list.splice(index, 1);
    }

    /*--------------------------------------------------------------------
    # Description: Returns the number of playlist entries.
    # Parameters : -
    # Return     : number of playlist entries.
    /*------------------------------------------------------------------*/
    function CPlaylist_size()
    {
        return this.list.length;
    }
    
    /*--------------------------------------------------------------------
    # Description: Loads a playlist .plx file. File source is indicated by
    #              the 'filename' parameter or the 'mediaitem' parameter.
    # Parameters : filename=URL or local file
    #              mediaitem=CMediaItem object to load
    # Return     : 0=succes, 
    #              -1=invalid playlist version, 
    #              -2=could not open playlist
    /*------------------------------------------------------------------*/
    function CPlaylist_load_plx(filename, mediaitem, proxy)
    {
        if (filename != '')
            this.URL = filename;
        else
            this.URL = mediaitem.URL;
        
        var file = getRemote(this.URL, {}).content;
        if (file == '')
            return -2
        try{
            var data = file.toString().split(/\r?\n/);
        }
        catch(err)
        {
            showtime.trace(err);
            return -2
        }
        
        var start = new Date();
        //defaults
        this.version = '-1';
        this.background = mediaitem.background;
        this.logo = 'none';
        if (mediaitem.thumb != 'default')
            this.logo = mediaitem.thumb;
        //
        this.icon_playlist = 'default';
        this.icon_rss = 'default';
        this.icon_script = 'default';
        this.icon_video = 'default';
        this.icon_audio = 'default';
        this.icon_image = 'default';
        this.icon_text = 'default';
        this.icon_search = 'default';
        this.icon_download = 'default';
        //
        this.title = '';
        this.type = 'playlist';
        this.description = '';
        this.player = mediaitem.player;
        this.view = mediaitem.view;
        this.processor = mediaitem.processor;
        this.playmode = 'default';         
        this.start_index = 0;

        //parse playlist entries 
        var counter = 0;
        var state = 0;
        var tmp='';
        var previous_state = 0;
        
        var key = '';
        var value = '';
        var index = -1;
        
        for each (var m in data)
        {
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
                    else if (key == 'player' && state == 0)
                        this.player=value;
                    else if (key == 'logo' && state == 0)
                        this.logo=value;
                    //
                    else if (key == 'icon_playlist' && state == 0)
                        this.icon_playlist=value;
                    else if (key == 'icon_rss' && state == 0)
                        this.icon_rss=value;                        
                    else if (key == 'icon_script' && state == 0)
                        this.icon_script=value;                        
                    else if (key == 'icon_video' && state == 0)
                        this.icon_video=value;                        
                    else if (key == 'icon_audio' && state == 0)
                        this.icon_audio=value;                        
                    else if (key == 'icon_image' && state == 0)
                        this.icon_image=value;
                    else if (key == 'icon_text' && state == 0)
                        this.icon_text=value;
                    else if (key == 'icon_search' && state == 0)
                        this.icon_search=value;
                    else if (key == 'icon_download' && state == 0)
                        this.icon_download=value;
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
                        if (state == 1)
                            this.list.push(tmp);
                        else //state=0                        
                            this.list.splice(0, this.list.length);
//@todo                            
                        tmp = new CMediaItem(); //create new item
                        tmp.type = value;
                        if (tmp.type == 'video' || tmp.type == 'audio')
                        {
                            tmp.player = this.player;
                            tmp.processor = this.processor;
                        }

                        counter = counter + 1;
                        state = 1;
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
                    else if (key == 'DLloc')
                        tmp.DLloc=value;
                    else if (key == 'player')
                        tmp.player=value; 
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
        
        /*if no version ID is found then this is not a valid playlist.
#the next lines to not work because they current playlist is already lost.
#        if this.version == '-1':
#            return -2*/
        
        var end = new Date();
        showtime.trace("Time used to parse playlist: "+(end-start))
        
        return 0 //successful
    }
    
    /*--------------------------------------------------------------------
    # Description: Loads a RSS webfeed.
    # Parameters : filename=URL or local file
    #              mediaitem=CMediaItem object to load    
    # Return     : 0=succes, 
    #              -1=invalid playlist version, 
    #              -2=could not open playlist
    /*------------------------------------------------------------------*/
    function CPlaylist_load_rss_20(filename, mediaitem, proxy) {
        if (filename != '')
            this.URL = filename
        else
            this.URL = mediaitem.URL

        if (this.URL.slice(0,6) == 'rss://')      
            this.URL = this.URL.replace('rss:', 'http:')
        
        var data = getRemote(this.URL).content.split('<item')
        
        //defaults
        this.version = plxVersion
        //use the current background image if mediaitem background is not set.
        if (mediaitem.background != 'default')
            this.background = mediaitem.background
        this.logo = 'none'
        this.title = ''
        this.description = ''
        this.player = mediaitem.player
        this.processor = mediaitem.processor
        this.playmode = 'default'
        this.start_index = 0
        //clear the list
        this.list.splice(this.list.length)
        
        //set the default type
        var index=mediaitem.type.indexOf(":")
        var type_default;
        if (index != -1)
            type_default = mediaitem.type.slice(index+1)
        else
            type_default = ''
        
        var counter=0
        //parse playlist entries 
        for each(var m in data) {
            if (counter == 0) {
                //fill the title
                index = m.indexOf('<title>')
                if (index != -1) {
                    var index2 = m.indexOf('</title>')
                    if (index != -1) {
                        var value = m.slice(index+7,index2)
                        this.title = value
                    }
                }

                index = m.indexOf('<description>')
                if (index != -1) {
                    index2 = m.indexOf('</description>')
                    if (index2 != -1) {
                        value = m.slice(index+13,index2)
                        this.description = value
                        var index3 = this.description.indexOf('<![CDATA[')
                        if (index3 != -1)
                            this.description = this.description.slice(9,this.description-3)
                    }
                }
                
                //fill the logo
                index = m.indexOf('<image>')
                if (index != -1) {
                    index2 = m.indexOf('</image>')
                    if (index != -1) {
                        index3 = m.indexOf('<url>', index, index2)
                        if (index != -1) {
                            var index4 = m.indexOf('</url>', index, index2)
                            if (index != -1)
                                value = m.slice(index3+5,index4)
                                this.logo = value
                        }
                    }
                }
                else { //try if itunes image
                    index = m.indexOf('<itunes:image href="')
                    if (index != -1) {
                        index2 = m.indexOf('"', index+20)
                        if (index != -1) {
                            value = m.slice(index+20,index2)
                            this.logo = value
                        }
                    }
                }
       
                counter++
            }
            else {
                var tmp = new CMediaItem() //create new item
                tmp.player = this.player
                tmp.processor = this.processor

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
                index = m.indexOf('<title')
                if (index != -1) {
                    index2 = m.indexOf('>', index)
                    if (index2 != -1) {
                        index3 = m.indexOf('</title>')
                        if (index3 != -1) {
                            index4 = m.indexOf('![CDATA[', index2, index3)
                            if (index4 != -1)
                                value = m.slice(index2+10,index3-3)
                            else
                                value = m.slice(index2+1,index3)
                            value = value.replace('\n'," '")                              
                            tmp.name = tmp.name + value
                        }
                    }
                }
                                             
                //get the description.
                var index1 = m.indexOf('<content:encoded>')
                index = m.indexOf('<description>')
                if (index1 != -1) {
                    index2 = m.indexOf('</content:encoded>')
                    if (index2 != -1) {
                        value = m.slice(index1+17,index2)
                        //value = value.replace('&#39;',"\'")   
                        tmp.description = value
                        index3 = tmp.description.indexOf('<![CDATA[')
                        if (index3 != -1)
                            tmp.description = tmp.description.slice(9,-3)
                        showtime.trace(tmp.description)
                    }
                }
                else if (index != -1) {
                    index2 = m.indexOf('</description>')
                    if (index2 != -1) {
                        value = m.slice(index+13,index2)
                        //value = value.replace('&#39;',"\'")   
                        tmp.description = value
                        index3 = tmp.description.indexOf('<![CDATA[')
                        if (index3 != -1)
                            tmp.description = tmp.description.slice(9,-3)
                    }
                }

                //get the thumb
                index = m.indexOf('<media:thumbnail')
                if (index != -1) {
                    index2 = m.indexOf('url=', index+16)
                    if (index2 != -1) {
                        index3 = m.indexOf('"', index2+5)
                        if (index3 != -1) {
                            value = m.slice(index2+5,index3)
                            tmp.thumb = value
                        }
                    }
                }
                            
                if (tmp.thumb == 'default') {
                    //no thumb image found, therefore grab any jpg image in the item
                    index = m.indexOf('.jpg')
                    if (index != -1) {
                        index2 = m.lastIndexOf('http', 0, index)
                        if (index2 != -1) {
                            value = m.slice(index2,index+4)
                            tmp.thumb = value  
                            showtime.trace(tmp.thumb);
                        }
                    }
                }
                
                //get the enclosed content.
                index = m.indexOf('enclosure')
                index1 = m.indexOf ('<media:content')              
                if (((index != -1) || (index1 != -1))) { // and (tmp.processor==''):
                    //enclosure is first choice. If no enclosure then use media:content
                    if ((index == -1) && (index1 != -1))
                        index = index1
                    index2 = m.indexOf('url="',index) //get the URL attribute
                    if (index2 != -1)
                        index3 = m.indexOf('"', index2+5)
                    else {
                        index2 = m.indexOf("url='",index)
                        if (index2 != -1)
                            index3 = m.indexOf("'", index2+5)
                    }
                    if ((index2 != -1) && (index3 != -1))
                        value = m.slice(index2+5,index3)
                        tmp.URL = value
                    
                    //get the media type
                    if (type_default != '')
                        tmp.type = type_default

                    if (tmp.type == 'unknown') {  
                        index2 = m.indexOf('type="',index) //get the type attribute
                        if (index2 != -1) {
                            index3 = m.indexOf('"', index2+6)
                            if (index3 != -1) {
                                var type = m.slice(index2+6,index3)
                                if (type.slice(0,11) == 'application')
                                    tmp.type = 'download'
                                else if (type.slice(0,5) == 'video')
                                    tmp.type = 'video'
                            }
                        }
                    }
                        
                    if ((tmp.type == 'unknown') && (tmp.URL != '')) { //valid URL found
                        //validate the type based on file extension
                        var ext_pos = tmp.URL.lastIndexOf('.') //find last '.' in the string
                        if (ext_pos != -1) {
                            var ext = tmp.URL.slice(ext_pos+1)
                            ext = ext.toLowerCase()
                            if (ext == 'jpg' || ext == 'gif' || ext == 'png')
                                tmp.type = 'image'
                            else if (ext == 'mp3')
                                tmp.type = 'audio'
                            else
                                tmp.type = 'video'
                        }
                    }
                }
                if ((tmp.type == 'unknown') || (tmp.processor != '')) {
                //else: //no enclosed URL and media content or the processor tag has been set, use the link
                    index = m.indexOf('<link>')
                    if (index != -1) {
                        index2 = m.indexOf('</link>', index+6)
                        if (index2 != -1) {
                            value = m.slice(index+6,index2)  
                            tmp.URL = value
                        
                            //get the media type
                            if (type_default != '')
                                tmp.type = type_default
                            else if (value.slice(0,6) == 'rss://')
                                tmp.type = 'rss'                       
                            else
                                tmp.type = 'html'
                        }
                    }
                }
                                        
                if (tmp.URL != '') {
                    this.list.push(tmp)
                    counter = counter + 1
                }
            }
        }
        
        /*#Post rocessing in case of Youtube playlist URL.   
        this.load_youtube_postprocessor(filename, mediaitem, proxy) */
        
        return 0
    }
    
    /*--------------------------------------------------------------------
    # Description: Loads a atom webfeed.
    # Parameters : filename=URL or local file
    #              mediaitem=CMediaItem object to load    
    # Return     : 0=success, 
    #              -1=invalid playlist version, 
    #              -2=could not open playlist
    /*------------------------------------------------------------------*/
    function CPlaylist_load_atom_10(filename, mediaitem, proxy) {
        if (filename != '')
            this.URL = filename
        else
            this.URL = mediaitem.URL

        try {
            var data = getRemote(this.URL).content.split('<entry')
        }
        catch(err) {
            showtime.trace(err)
            return -2;
        }
        
        //defaults
        this.version = plxVersion
        //use the current background image if mediaitem background is not set.
        if (mediaitem.background != 'default')
            this.background = mediaitem.background
        this.logo = 'none'
        this.title = ''
        this.description = ''
        this.player = mediaitem.player
        this.processor = mediaitem.processor
        this.playmode = 'default'
        this.start_index = 0
        //clear the list
        this.list.splice(this.list.lenght)
        
        //set the default type
        var index=mediaitem.type.indexOf(":")
        var type_default
        if (index != -1)
            type_default = mediaitem.type.slice(index+1)
        else
            type_default = ''
        
        var counter=0
        //parse playlist entries 
        for each (var m in data) {
            if (counter == 0) {
                //fill the title
                index = m.indexOf('<title>')
                if (index != -1) {
                    var index2 = m.indexOf('</title>')
                    if (index != -1) {
                        var value = m.slice(index+7,index2)
                        this.title = value
                    }
                }

                index = m.indexOf('<subtitle')
                if (index != -1) {
                    index2 = m.indexOf('</subtitle>')
                    if (index2 != -1) {
                        value = m.slice(index+13,index2)
                        this.description = value
                        var index3 = this.description.indexOf('<![CDATA[')
                        if (index3 != -1)
                            this.description = this.description.slice(9,-3)
                    }
                }
                
                //fill the logo
                index = m.indexOf('<logo>')
                if (index != -1) {
                    index2 = m.indexOf('</logo>')
                    if (index2 != -1) {
                        index3 = m.indexOf('http', index, index2)
                        if (index3 != -1) {
                            var index4 = m.indexOf('</', index3, index2+2)
                            if (index4 != -1) {
                                value = m.slice(index3,index4)
                                this.logo = value
                            }
                        }
                    }
                }

                //fill the logo
                index = m.indexOf('<icon>')
                if (index != -1) {
                    index2 = m.indexOf('</icon>')
                    if (index2 != -1) {
                        index3 = m.indexOf('http', index, index2)
                        if (index3 != -1) {
                            index4 = m.indexOf('</', index3, index2+2)
                            if (index4 != -1) {
                                value = m.slice(index3,index4)
                                this.logo = value
                            }
                        }
                    }
                }
 
                counter = counter + 1
            }
            else {
                var tmp = new CMediaItem() //create new item
                tmp.player = this.player
                tmp.processor = this.processor

                //get the publication date.
                index = m.indexOf('<published')
                if (index != -1) {
                    index2 = m.indexOf('>', index)
                    if (index2 != -1) {
                        index3 = m.indexOf('</published')
                        if (index3 != -1) {
                            index4 = m.indexOf(':', index2, index3)
                            if (index4 != -1) {
                                value = m.slice(index2+1,index4-3)
                                value = value.replace('\n',"") 
                                tmp.name = value
                            }
                        }
                    }
                }
                                
                //get the publication date.
                index = m.indexOf('<updated')
                if (index != -1) {
                    index2 = m.indexOf('>', index)
                    if (index2 != -1) {
                        index3 = m.indexOf('</updated')
                        if (index3 != -1) {
                            index4 = m.indexOf(':', index2, index3)
                            if (index4 != -1) {
                                value = m.slice(index2+1,index4-3)
                                value = value.replace('\n',"") 
                                tmp.name = value 
                            }
                        }
                    }
                }
                                
                //get the title.
                index = m.indexOf('<title')
                if (index != -1) {
                    index2 = m.indexOf('>', index)
                    if (index2 != -1) {
                        index3 = m.indexOf('</title>')
                        if (index3 != -1) {
                            index4 = m.indexOf('![CDATA[', index2, index3)
                            if (index4 != -1)
                                value = m.slice(index2+10,index3-3)
                            else
                                value = m.slice(index2+1,index3)
                            value = value.replace('\n'," '")                              
                            tmp.name = tmp.name + ' ' + value
                        }
                    }
                }
                                             
                //get the description.
                index = m.indexOf('<summary')
                if (index != -1) {
                    index2 = m.indexOf('>', index)
                    if (index2 != -1) {
                        index3 = m.indexOf('</summary')
                        if (index3 != -1) {
                            value = m.slice(index2+1,index3)
                            value = value.replace('\n',"") 
                            tmp.description = value
                        }
                    }
                }

                if (tmp.description == '' && tmp.name != '')
                    tmp.description = tmp.name

                //get the thumb
                index = m.indexOf('<link type="image')
                if (index != -1) {
                    index2 = m.indexOf('href=', index+16)
                    if (index2 != -1) {
                        index3 = m.indexOf('"', index2+6)
                        if (index3 != -1) {
                            value = m.slice(index2+6,index3)
                            tmp.thumb = value
                        }
                    }
                }

                if (tmp.thumb == 'default') {
                    //no thumb image found, therefore grab any jpg image in the item
                    index = m.indexOf('.jpg')
                    if (index != -1) {
                        index2 = m.rfind('http', 0, index)
                        if (index2 != -1) {
                            value = m.slice(index2,index+4)
                            tmp.thumb = value
                        }
                    }
                }

                //get the enclosed content.
                index = m.indexOf('<link rel="enclosure')   
                if (index == -1)
                    index = m.indexOf('<link')   
                if (index != -1) {
                    index2 = m.indexOf('href=',index) //get the URL attribute
                    if (index2 != -1) {
                        index3 = m.indexOf(m[index2+5], index2+6)
                        if (index3 != -1) {
                            value = m.slice(index2+6,index3)
                            tmp.URL = value
                        }
                    }
                                          
                    //get the media type
                    if (type_default != '')
                        tmp.type = type_default

                    if (tmp.type == 'unknown') {  
                        index2 = m.indexOf('type="',index) //get the type attribute
                        if (index2 != -1) {
                            index3 = m.indexOf('"', index2+6)
                            if (index3 != -1) {
                                var type = m.slice(index2+6,index3)
                                if (type.slice(0,11) == 'application')
                                    tmp.type = 'download'
                                else if (type.slice(0,5) == 'video')
                                    tmp.type = 'video'
                            }
                        }
                    }
                        
                    if ((tmp.type == 'unknown') && (tmp.URL != '')) {//valid URL found
                        //validate the type based on file extension
                        var ext_pos = tmp.URL.lastIndexOf('.') //find last '.' in the string
                        if (ext_pos != -1) {
                            var ext = tmp.URL.slice(ext_pos+1)
                            ext = ext.toLowerCase()
                            if (ext == 'jpg' || ext == 'gif' || ext == 'png')
                                tmp.type = 'image'
                            else if (ext == 'mp3')
                                tmp.type = 'audio'
                            else
                                tmp.type = 'html'
                        }
                    }
                }
                                                       
                if (tmp.URL != '') {
                    this.list.push(tmp)
                    counter++
                }
            }
        }

        /*#Post rocessing in case of Youtube playlist URL.   
        this.load_youtube_postprocessor(filename, mediaitem, proxy) */
                    
        return 0
    }
    
    /*--------------------------------------------------------------------
    # Description: Loads a OPML file.
    # Parameters : filename=URL or local file
    #              mediaitem=CMediaItem object to load    
    # Return     : 0=succes, 
    #              -1=invalid playlist version, 
    #              -2=could not open playlist
    /*------------------------------------------------------------------*/
    function CPlaylist_load_opml_10(filename, mediaitem, proxy) {
        if (filename != '')
            this.URL = filename
        else
            this.URL = mediaitem.URL

        var data = getRemote(this.URL).content
        
        //defaults
        this.version = plxVersion
        this.background = mediaitem.background
        this.logo = 'none'
        if (mediaitem.thumb != 'default')     
            this.logo = mediaitem.thumb  
        this.title = ''
        this.type = 'opml'
        this.description = ''
        this.player = mediaitem.player
        this.playmode = 'default'
        this.view = 'default'         
        this.start_index = 0
        //clear the list
        this.list.splice(this.list.length)
        
        //first process the header
        var index = data.indexOf('<title>')
        if (index != -1) {
            var index2 = data.indexOf('</title>')
            if (index2 != -1) {
                value = data.slice(index+7,index2)
                this.title = value  
            }
        }
        
        //now process the elements
        data = data.split('<outline')
            
        var counter=0
        //parse playlist entries 
        for each (var m in data) {
            var tmp = new CMediaItem() //create new item
            //fill the title
            index = m.indexOf('text=')
            if (index != -1) {
                index2 = m.indexOf('"', index+6)
                if (index2 != -1) {
                    var value = m.slice(index+6,index2)
                    tmp.name = value 
                }
            }
            
            index = m.indexOf('image=')
            if (index != -1) {
                index2 = m.indexOf('"', index+7)
                if (index2 != -1) {
                    value = m.slice(index+7,index2)
                    tmp.thumb= value
                }
            }

            index = m.indexOf('bitrate=')
            if (index != -1) {
                index2 = m.indexOf('"', index+9)
                if (index2 != -1) {
                    value = m.slice(index+9,index2)
                    tmp.infotag= value
                }
            }
            
            index = m.indexOf('URL=')
            if (index != -1) {
                index2 = m.indexOf('"', index+5)
                if (index2 != -1) {
                    value = m.slice(index+5,index2)
                    tmp.URL= value  
                }
            }
            
            index = m.indexOf('type=')
            if (index != -1) {
                index2 = m.indexOf('"', index+6)
                if (index2 != -1) {
                    value = m.slice(index+6,index2)

                    if (value == "link") {
                        tmp.type = 'opml'
                        if ((tmp.thumb == 'default') && (this.logo != 'none'))
                            tmp.thumb = this.logo
                    }
                    else if (value == 'audio')                   
                        tmp.type = 'audio'
                    else                    
                        tmp.type = 'video'
                }
            }
        
            if (tmp.name != "")
                this.list.push(tmp)
        }
                                  
        return 0
    }
    
//-------------------------------- CMediaItem ----------------------------------------------------------------
    
/*--------------------------------------------------------------------
# Description: Playlist item class. 
######################################################################
#class CMediaItem:
#    def __init__(this, id='0', type='unknown', version=plxVersion, name='', thumb='default', URL=''):
#        this.id = id        #identifier
#        this.type = type    #type (playlist, image, video, audio, text)
#        this.version = version #playlist version
#        this.name = name    #name as displayed in list view
#        this.thumb = thumb  #URL to thumb image or 'default'
#        this.URL = URL      #URL to playlist entry
/*------------------------------------------------------------------*/
function CMediaItem() 
{
    this.type='unknown'; //(required) type (playlist, image, video, audio, text)
    this.version=plxVersion; //(optional) playlist version
    this.name=''; //(required) name as displayed in list view
    this.description=''; //(optional) description of this item
    this.date=''; //(optional) release date of this item (yyyy-mm-dd)
    this.thumb='default'; //(optional) URL to thumb image or 'default'
    this.icon='default'; //(optional) URL to icon image or 'default'
    this.URL=''; //(required) URL to playlist entry
    this.DLloc=''; //(optional) Download location
    this.player='default'; //(optional) player core to use for playback
    this.processor=''; //(optional) URL to mediaitem processing server
    this.playpath=''; //(optional) 
    this.swfplayer=''; //(optional)
    this.pageurl=''; //(optional)
    this.background='default'; //(optional) background image
    this.rating=''; //(optional) rating value
    this.infotag='';
    this.view='default'; //(optional) List view option (list, panel)
    
    this.GetType = CMediaItem_GetType;
}
               
    /*--------------------------------------------------------------------
    # Description: Get mediaitem type.
    # Parameters : field: field to retrieve (type or attributes)
    # Return     : -
    /*------------------------------------------------------------------*/
    function CMediaItem_GetType(field)
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
    
    
function CURLLoader()
{
    this.parent=0;
    this.urlopen = CURLLoader_urlopen;
    this.geturl_processor = CURLLoader_geturl_processor;
}

    function re_match(pregex,str){
	// attempt to execute python-style regexp in javascript
	// note: \n will not currently match a \s when using (?s)
	var switches='';
	if(pregex.search(/^\(\?([gmsi]+)\)/)==0){
		switches=RegExp.$1;
		pregex=pregex.replace(/^\(\?[gmsi]+\)/,'');
	}
	if(switches.match(/s/)){
		// multi-line hack
		switches=switches.replace(/s/,'');
		pregex=pregex.replace(/\\n/g,'\\s');
		str=str.replace(/\n/g," ");
	}
	var re=new RegExp(pregex,switches);
	var matches=re.exec(str);
	return matches;
    }

    /*--------------------------------------------------------------------
    # Description: This class is used to retrieve the direct URL of given
    #              URL which the Showtime player understands.
    #              
    # Parameters : URL=source URL, mediaitem = mediaitem to open
    # Return     : 0=successful, -1=fail
    /*------------------------------------------------------------------*/
    function CURLLoader_urlopen(URL, mediaitem)
    {
        var result = 0; //successful
        showtime.trace(getFileExtension(URL))
        if (mediaitem.processor != '')
            result = this.geturl_processor(mediaitem);
        else if (URL.indexOf('http://www.youtube.com') != -1){
            mediaitem.processor = "http://navix.turner3d.net/proc/youtube";
            result = this.geturl_processor(mediaitem);
        }
        else if (URL.slice(0,4) == 'http'){
            result = this.geturl_processor(mediaitem);
            //result = this.geturl_redirect(URL);
        }
        else
            this.loc_url = URL;
        
        return result;
    }
    
    var phase, htmRaw, inst, verbose, proc_args, inst_prev, headers, v, remoteObj;
    var lines, linenum, ln_last, ln_count, scrape, src_printed, if_satisfied, if_next, if_end;
    var exflag, phase1complete, ke, va, str_out, noexec, subj, arg, tsubj, str_info, hkey, rerep;
    var lkey, oper, rraw, rside, bool, if_report, oldtmp, dp_type, dp_key;
    var lparse=new RegExp(/^([^ =]+)([ =])(.+)$/);
    var ifparse=new RegExp(/^([^<>=!]+)\s*([!<>=]+)\s*(.+)$/);
    var def_agent='Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.0.4) Gecko/2008102920 Firefox/3.0.4';
    
    /*--------------------------------------------------------------------
    # Description: This class is used to retrieve media playback
    #              parameters using a processor server
    #              
    # Parameters : mediaitem = mediaitem to open
    # Return     : 0=successful, -1=fail
    /*------------------------------------------------------------------*/
    function CURLLoader_geturl_processor(mediaitem){
        htmRaw="";

        if (htmRaw==""){
            showtime.trace("Processor: phase 1 - query\n URL: "+mediaitem.URL+"\n Processor: "+mediaitem.processor);
            //SetInfoText("Processor: getting filter...")
            htmRaw=getRemote(mediaitem.processor+'?url='+escape(mediaitem.URL),{'cookie':'version='+Version+'.'+SubVersion+'; platform='+'linux'})['content'];
            //proc_ori=htmRaw;
        }
        if (htmRaw <= ''){
            showtime.trace("Processor error: nothing returned from learning phase");
            //SetInfoText("")
            return -1;
        }
        if (htmRaw.slice(0,2)=='v2'){
            htmRaw=htmRaw.slice(3);
            inst=htmRaw;
            htmRaw='';
            phase=0;
            exflag=false;
            phase1complete=false;
            verbose=service.processorDebug;
            proc_args='';
            inst_prev='';
            headers={};

            v=new NIPLVars();

            // dot property parser
            var dotvarparse=new RegExp('^(nookies|s_headers)\.(.+)$');
            
            // condition parser
            ifparse=new RegExp('^([^<>=!]+)\s*([!<>=]+)\s*(.+)$');

            // dot property parser
            dotvarparse=new RegExp('^(nookies|s_headers)\.(.+)$');

            /*nookies=NookiesRead(mediaitem.processor)
            for ke in nookies:
                hkey='nookies.'+ke
                v.data[hkey]=nookies[ke]['value']*/

            while (exflag==false){
                scrape=1;
                phase=phase+1;
                var rep={};

                if_satisfied=false;
                if_next=false;
                if_end=false;

                src_printed=false;

                // load defaults into v, leave undefined keys alone
		v.reset();

                // get instructions if args present
                if (proc_args>''){
                    //SetInfoText("Processor: phase "+str(phase)+" learn")
                    showtime.trace("Processor: phase "+phase.toString()+" learn");
                    inst=getRemote(mediaitem.processor+'?'+proc_args)['content'];
                    proc_args='';
                }
                else if (phase1complete){
                    //SetInfoText("")
                    showtime.trace("Processor error: nothing to do");
                    exflag=true
                }
                else
                    v.data['s_url']=mediaitem.URL;

                if (inst==inst_prev){
                    showtime.trace("Processor error: endless loop detected");
                    //SetInfoText("")
                    return -1;
                }

                inst_prev=inst;
                lines=inst.split("\n");
                if (lines.length < 1){
                    showtime.trace("Processor error: nothing returned from phase "+phase.toString());
                    //SetInfoText("")
                    return -1;
                }
                linenum=0;
                
                for each (var line in lines){
                    //showtime.trace(line);
                    linenum++;
                    line=line.replace(/^\s*/, '');
                    //showtime.trace(line);
                    if (verbose>0 && src_printed==false){
                        showtime.trace("Processor NIPL source:\n"+inst);
                        src_printed=true;
                    }
                    if (line>'' && verbose>1){
                        noexec='';
                        if (if_next || if_end)
                            noexec=' (skipped)';
                        var str_report="NIPL line "+linenum+noexec+": "+line;
                        if (verbose>2 && (if_next || if_satisfied || if_end))
                            str_report=str_report+"\n (IF: satisfied="+if_satisfied.toString()+", skip to next="+if_next.toString()+", skip to end="+if_end.toString()+")";
                        showtime.trace(str_report);
                    }
                    // skip comments and blanks
                    if (line.slice(0,1)=='#' || line.slice(0,2)=='//' || line=='')
                        continue

                    if (if_end && line!='endif')
                        continue

                    if (if_next && line.slice(0,5)!='elseif' && line!='else' && line!='endif')
                        continue;

                    if (line=='else'){
                        if (if_satisfied)
                            if_end=true;
                        else {
                            if_next=false;
                            if (verbose>0)
                                showtime.trace("Proc debug else: executing");
                        }
                        continue
                    }
                    else if (line=='endif') {
                        if_satisfied=false;
                        if_next=false;
                        if_end=false;
                        continue;
                    }
                    else if (line=='scrape') {
                        str_info="Processor:";
                        if (phase>1)
                            str_info=str_info+" phase "+phase;
                        str_info=str_info+" scrape";
                        if (scrape>1)
                            str_info=str_info+" "+scrape;
                        //SetInfoText(str_info)
                        if (v.data['s_url']==''){
                            showtime.trace("Processor error: no scrape URL defined");
                            //SetInfoText("")
                            return -1;
                        }
                        scrape++
                        var scrape_args={
                          'referer': v.data['s_referer'],
                          'cookie': v.data['s_cookie'],
                          'method': v.data['s_method'],
                          'agent': v.data['s_agent'],
                          'action': v.data['s_action'],
                          'postdata': v.data['s_postdata'],
                          'headers': headers
                        };
                        showtime.trace("Processor "+v.data['s_method'].toUpperCase()+"."+v.data['s_action']+": "+v.data['s_url']);
                        if (verbose>0) {
                            showtime.trace("Proc debug remote args:");
                            showtime.trace(scrape_args);
                        }
                        remoteObj=getRemote(v.data['s_url'], scrape_args);
                        //showtime.trace(remoteObj);


                        v.data['htmRaw']=remoteObj['content'];
                        v.data['geturl']=remoteObj['geturl'];
                        // backwards-compatibility for pre 3.5.4
                        if (v.data['s_action']=='geturl')
                            v.data['v1']=v.data['geturl'];
                        str_out="Proc debug headers:";
                        for (ke in remoteObj['headers']){
                            //showtime.trace(ke);
                            hkey='headers.'+ke;
                            //showtime.trace(hkey);
                            str_out=str_out+"\n "+ke+": "+remoteObj['headers'][ke].toString();
                            v.data[hkey]=remoteObj['headers'][ke].toString();
                        }
                        if (verbose>0)
                            showtime.trace(str_out);

                        str_out="Proc debug cookies:";
                        for (ke in remoteObj['cookies']){
                            hkey='cookies.'+ke;
                            str_out=str_out+"\n "+ke+": "+remoteObj['cookies'][ke].toString();
                            v.data[hkey]=remoteObj['cookies'][ke].toString();
                        }
                        if (verbose>0)
                            showtime.trace(str_out);

/*                        if (v.data['s_action']=='headers')
#                            headers=remoteObj
#                            str_out="Proc debug headers:"
#                            for ke in headers:
#                                str_out=str_out+"\n "+ke+": "+str(headers[ke])
#                                v.data[ke]=str(headers[ke])
#                            if verbose>0:
#                                showtime.trace(str_out
#                        elif v.data['s_action']=='geturl':
#                            v.data['v1']=remoteObj
#                        else:
#                            v.data['htmRaw']=remoteObj*/

                        if (v.data['s_action']=='read' && v.data['regex']>'' && v.data['htmRaw']>''){
                            // get finished - run regex, populate v(alues) and rep(ort) if regex is defined
                            v.data['nomatch']='';
                            rep['nomatch']='';
                            for (i=1; i < 12; i++){
                                ke='v'+i.toString();
                                v.data[ke]='';
                                rep[ke]='';
                            }
                            var match=re_match(v.data['regex'],v.data['htmRaw']);
                            if (match){
                                rerep='Processor scrape:';
                                for(i=1;i<match.length;i++){
                                    val=match[i];
                                    var key='v'+i.toString();
                                    rerep=rerep+"\n "+key+'='+val;
                                    rep[key]=val;
                                    v.data[key]=val;
                                }
                                if (verbose>0)
                                    showtime.trace(rerep);
                            }
                            else{
                                if (verbose>0)
                                    showtime.trace('Processor scrape: no match');
                                rep['nomatch']=1;
                                v.data['nomatch']=1;
                            }
                        }
                        // reset scrape params to defaults
                        v.data['s_method']='get';
			v.data['s_action']='read';
			v.data['s_agent']=def_agent;
			v.data['s_referer']='';
			v.data['s_cookie']='';
			v.data['s_postdata']='';
                    }
                    else if (line=='play'){
                        if (verbose==1)
                            showtime.trace("Proc debug: play");
                        exflag=true;
                        break;
                    }
                    else if (line=='report'){
                        rep['phase']=phase.toString();
                        proc_args=urlencode(rep);
                        proc_args=proc_args.replace('v\d+=&','&');
                        proc_args=proc_args.replace('nomatch=&','&');
                        proc_args=proc_args.replace('&+','&');
                        proc_args=proc_args.replace('^&','');
                        str_report="Processor report:";
                        try{
                        for each (var ke in rep){
                            if (rep[ke]>'')
                                str_report=str_report+"\n "+ke+": "+rep[ke];
                        }
                        }
                        catch(err){
                            continue;
                        }
                        showtime.trace(str_report);
                        break;
                    }
                    else{
                        if (line.indexOf(/^\s*/)!=-1)
                            break;
                        // parse
                        match=lparse.exec(line)
                        showtime.trace(match)
                        if (!match){
                            showtime.trace("Processor syntax error: "+line);
                            //SetInfoText("")
                            return -1;
                        }
                        subj=match[1];
                        arg=match[3];
                        if (subj=='if' || subj=='elsif'){
                            if (if_satisfied)
                                if_end=true
                            else{

                                // process if / elseif operators
                                match=ifparse.exec(arg);
                                if (match){
                                    // process if with operators
                                    lkey=match[1];
                                    oper=match[2];
                                    rraw=match[3];
                                    if (oper=='=')
                                        oper='==';
                                    if (rraw.slice(0,1)=="'")
                                        rside=rraw.slice(1,rraw.length);
                                    else
                                        rside=v.data[rraw];
                                    bool=eval("v.data[lkey]"+oper+"rside");
                                    if_report=" test: "+lkey+" "+oper+" "+rraw+"\n  left: "+v.data[lkey]+"\n right: "+rside;
                                }
                                else{
                                    // process single if argument for >''
                                    if(!v.data[arg]) v.data[arg]='';
                                    bool=v.data[arg]>'';
                                    if_report=arg;
                                    if (bool)
                                        if_report=if_report+" > ";
                                    else
                                        if_report=if_report+" = ";
                                    if_report=if_report+"'': "+v.data[arg];
                                }
                            }
                            if (bool){
                                if_satisfied=true;
                                if_next=false;
                            }
                            else
                                if_next=true;

                            if (verbose>0)
                                showtime.trace("Proc debug "+subj+" => "+bool.toString()+":\n "+if_report);
                            continue;
                        }
                        if (match[2]=='='){
                            // assignment operator
                            var areport;
                            if (arg.slice(0,1)=="'"){
                                val=arg.slice(1);
                                areport="string literal";
                            }
                            else{
                                val=v.data[arg];
                                areport=arg;
                            }
                            match=dotvarparse.exec(subj);
                            if (match){
                                dp_type=match[1];
                                dp_key=match[2];
                                tsubj=dp_key;
                                /*if (dp_type=='nookies')
                                    # set nookie
                                    treport="nookie"
                                    NookieSet(mediaitem.processor, dp_key, val, v.data['nookie_expires'])
                                    v.data[subj]=val*/

                                if (dp_type=='s_headers'){
                                    // set scrape header
                                    var treport="scrape header";
                                    headers[dp_key]=val;
                                }
                            }
                            else{
                                // set variable
                                treport="variable";
                                tsubj=subj;
                                v.data[subj]=val;
                            }
                            if (verbose>0)
                                showtime.trace("Proc debug "+treport+": "+tsubj+" set to "+areport+"\n "+val);
                        }
                        else{
                            // do command
                            if (subj=='verbose')
                                verbose=parseInt(arg);

                            else if (subj=='error'){
                                showtime.trace("Processor error: "+arg.slice(1));
                               	//SetInfoText("")
                               	return -1;
                            }
                            else if (subj=='report_val'){
                                match=lparse.exec(arg);
                                if (!match){
                                    showtime.trace("Processor syntax error: "+line);
                                    //SetInfoText("")
                                    return -1;
                                }
                                ke=match[1];
                                va=match[3];
                                if (va.slice(0,1)=="'"){
                                    rep[ke]=va.slice(1,va.length);
                                    if (verbose>0)
                                        showtime.trace("Proc debug report value: "+ke+" set to string literal\n "+va.slice(1,va.length));
                                }
                                else{
                                    rep[ke]=v.data[va];
                                    if (verbose>0)
                                        showtime.trace("Proc debug report value: "+ke+" set to "+va+"\n "+v.data[va]);
                                }
                            }
                            else if (subj=='concat'){
                                match=lparse.exec(arg);
                                if (!match){
                                    showtime.trace("Processor syntax error: "+line);
                                    return -1;
                                }
                                ke=match[1];
                                va=match[3];
                                oldtmp=v.data[ke];
                                if (va.slice(0,1)=="'")
                                    v.data[ke]=v.data[ke]+va.slice(1,va.length);
                                else{
                                    if (v.data[va] != undefined)
                                        v.data[ke]=v.data[ke]+v.data[va];
                                    else
                                        v.data[ke]=v.data[ke];
                                }
                                if (verbose>0)
                                    showtime.trace("Proc debug concat:\n old="+oldtmp+"\n new="+v.data[ke]);
                            }
                            else if (subj=='match'){
                                v.data['nomatch']='';
                                rep['nomatch']='';
                                for (i = 1; i < 12; i++){
                                    ke='v'+i.toString();
                                    v.data[ke]='';
                                    rep[ke]='';
                                }
                                match=re_match(v.data['regex'],v.data[arg]);

                                if (match){
                                    rerep='Processor match '+arg+':';
                                    for(i=1;i<match.length;i++){
                                        val=match[i];
                                        key='v'+i.toString();
                                        rerep=rerep+"\n "+key+'='+val;
                                        v.data[key]=val;
                                    }
                                    if (verbose>0)
                                        showtime.trace(rerep);
                                }
                                else{
                                    if (verbose>0)
                                        showtime.trace("Processor match: no match\n regex: "+v.data['regex']+"\n search: "+v.data[arg]);
                                    v.data['nomatch']=1;
                                }
                            }
                            else if (subj=='replace'){
                               // pre-set regex, replace var [']val
                                match=lparse.exec(arg);
                                if (!match){
                                    showtime.trace("Processor syntax error: "+line);
                                    //SetInfoText("")
                                    return -1;
                                }
                                ke=match[1];
                                va=match[3];
                                if (va.slice(0,1)=="'")
                                    va=va.slice(1,va.length);
                                else
                                    va=v.data[va];
                                oldtmp=v.data[ke];
                                v.data[ke]=v.data[ke].replace(v.data['regex'], va);
                                if (verbose>0)
                                    showtime.trace("Proc debug replace "+ke+":\n old="+oldtmp+"\n new="+v.data[ke]);
                            }
                            else if (subj=='unescape'){
                                oldtmp=v.data[arg];
                                v.data[arg]=unescape(v.data[arg]);
                                if (verbose>0)
                                    showtime.trace("Proc debug unescape:\n old="+oldtmp+"\n new="+v.data[arg]);
                            }
                            else if (subj=='escape'){
                                oldtmp=v.data[arg];
                                v.data[arg]=escape(v.data[arg]);
                                if (verbose>0)
                                    showtime.trace("Proc debug escape:\n old="+oldtmp+"\n new="+v.data[arg]);
                            }
                            else if (subj=='debug'){
                                if (verbose>0) {
                                    try {
                                        showtime.trace("Processor debug "+arg+":\n "+v.data[arg])
                                    }
                                    catch(err) {
                                        showtime.trace("Processor debug "+arg+" - does not exist\n")
                                    }
                                }
                            }
                            else if (subj=='print'){
                                if (arg.slice(0,1)=="'")
                                    showtime.trace("Processor print: "+arg.slice(1));
                                else
                                    showtime.trace("Processor print("+arg+":\n "+v.data[arg]);
                            }
                            else{
                                showtime.trace("Processor error: unrecognized method '"+subj+"'");
                                return -1;
                            }
                        }
                    }
                }
            }
            if (v.data['agent']>'')
                v.data['url']=v.data['url']+'?|User-Agent='+v.data['agent'];
            mediaitem.URL=v.data['url'];
            if (v.data['playpath']>'' || v.data['swfplayer']>''){
                mediaitem.URL=mediaitem.URL+' tcUrl='+v.data['url'];
                if (v.data['app']>'')
                    mediaitem.URL=mediaitem.URL+' app='+v.data['app'];
                if (v.data['playpath']>'')
                    mediaitem.URL=mediaitem.URL+' playpath='+v.data['playpath'];
                if (v.data['swfplayer']>'')
                    mediaitem.URL=mediaitem.URL+' swfUrl='+v.data['swfplayer'];
                if (v.data['pageurl']>'')
                    mediaitem.URL=mediaitem.URL+' pageUrl='+v.data['pageurl'];
                if (v.data['swfVfy']>'')
                    mediaitem.URL=mediaitem.URL+' swfVfy='+v.data['swfVfy'];
            }
            else{
                mediaitem.swfplayer=v.data['swfplayer'];
                mediaitem.playpath=v.data['playpath'];
                mediaitem.pageurl=v.data['pageurl'];
            }
            mediaitem.processor='';
        }
        else{
            // proc v1
            var arr=htmRaw.split("\n");
            if (arr.length < 1){
                showtime.trace("Processor error: nothing returned from learning phase");
                //SetInfoText("")
                return -1;
            }
            URL=arr[0];
            if (URL.indexOf('error')!=-1){
                showtime.trace("Processor: "+URL);
                //SetInfoText("")
                return -1;
            }
            var report="Processor: phase 2 - instruct\n URL: "+URL;
            if (arr.length < 2){
                this.loc_url = URL;
                //SetInfoText("")
                showtime.trace("Processor: single-line processor stage 1 result\n playing "+URL);
                return 0;
            }
            var filt=arr[1];
            var ref = '';
            var cookie='';
            var htm = '';
            report=report+"\n filter: "+filt;
            if (arr.length > 2){
                ref=arr[2];
                report+="\n referer: "+ref;
            }
            else
                ref='';
            if (arr.length > 3){
                cookie=arr[3];
                report+="\n cookie: "+cookie;
            }
            else
                cookie='';

            showtime.trace(report);
            //SetInfoText("Processor: scraping...")
            htm=getRemote(URL,{'referer':ref,'cookie':cookie})['content'];
            if (htm == ''){
                showtime.trace("Processor error: nothing returned from scrape");
                //SetInfoText("")
                return -1
            }
            var p=new RegExp(filt);
            match=p.exec(htm);
            if (match){
                var tgt=mediaitem.processor;
                var sep='?';
                report='Processor: phase 3 - scrape and report';
                for(var i=1;i<match.length;i++){
                    var val=escape(match[i]);
                    tgt=tgt+sep+'v'+i.toString()+'='+val;
                    sep='&';
                    report=report+"\n v"+i.toString()+": "+val;
                }
                showtime.trace(report);
                //SetInfoText("Processor: processing...")
                var htmRaw2=getRemote(tgt)['content'];
                if (htmRaw2<=''){
                    showtime.trace("Processor error: could not retrieve data from process phase");
                    //SetInfoText("")
                    return -1;
                }
                arr=htmRaw2.split("\n");
                mediaitem.URL=arr[0];

                if (arr[0].indexOf('error')!=-1){
                    showtime.trace("Processor: "+arr[0]);
                    //SetInfoText("")
                    return -1;
                }
                if (arr.length > 1){ //No need to heck for rtmp availability in Showtime
                    mediaitem.URL=mediaitem.URL+' tcUrl='+arr[0]+' swfUrl='+arr[1];
                    if (arr.length > 2)
                        mediaitem.URL=mediaitem.URL+' playpath='+arr[2];
                    if (arr.length > 3)
                        mediaitem.URL=mediaitem.URL+' pageUrl='+arr[3];
                }
                mediaitem.processor='';
            }
            else{
                showtime.trace("Processor error: pattern not found in scraped data");
                //SetInfoText("")
                return -1;
            }
        }

        this.loc_url = mediaitem.URL;

        //SetInfoText("Processor complete - playing...")
        showtime.sleep(.1);
        //SetInfoText("")
        report=this.loc_url;
        if (mediaitem.playpath>'')
            report=report+"\n PlayPath: "+mediaitem.playpath;
        if (mediaitem.swfplayer>'')
            report=report+"\n SWFPlayer: "+mediaitem.swfplayer;
        if (mediaitem.pageurl>'')
            report=report+"\n PageUrl: "+mediaitem.pageurl;
        showtime.trace(report);
        video_link = report;

        return 0
    }
    
    function urlencode(arr){
	var strout;
	var arrVals=new Array();
	for(var k in arr){
		if(arr[k]>''){
			arrVals[arrVals.length]=k+'='+escape(arr[k]);
		}
	}
	return arrVals.join('&');
}
                        
    /*----------------------------------------------------------------
# Description: Retrieve remote information.
# Parameters : URL, retrieval parameters
# Return     : string containing the page contents;
/*------------------------------------------------------------------*/  
function getRemote(url,args){
    var ke= '';
    var oret;
    var rdefaults={
        'agent' : 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.0.4) Gecko/2008102920 Firefox/3.0.4',
        'referer': '',
        'cookie': '',
        'method': 'get',
        'action': 'read',
        'postdata': '',
        'headers': {}
    }

    args=rdefaults;
    if (url.indexOf(nxserver_URL) != -1){
        if (args['cookie']>'')
            args['cookie']=args['cookie']+'; ';
        args['cookie']=args['cookie']+'; nxid='+nxserver.user_id;
    }
    try{
        var hdr={'User-Agent':args['agent'], 'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8', 'Referer':args['referer'], 'Cookie':args['cookie']};
    }
    catch(err){
        showtime.trace("Unexpected error: "+err);
    }
    for (ke in args['headers']){
        try{
            hdr[ke]=args['headers'][ke];
        }
        catch(err){
            showtime.trace("Unexpected error: " + err);
        }
    }
    var req="";
    try{
        if (args['method'] == 'get') {
            req=showtime.httpGet(url, null, hdr);
        }
        else {
            req=showtime.httpPost(url, args['postdata'], null, hdr).toString();
        }
        
        var response=req.toString();
        
        var cookies={};
        
        oret={
      	    'headers':req.headers,
      	    'geturl':url,
      	    'cookies':cookies
        }
        
        if (args['action'] == 'read')
            oret['content']=response;
        
        var rkeys=['content','geturl'];
        var rkey='';
        for (rkey in rkeys){
            try{
                oret[rkey];
            }
            catch(err){
                oret[rkey]='';
            }
        }
        rkeys=['cookies','headers'];
        for (rkey in rkeys){
            try{
                oret[rkey];
            }
            catch(err){
                oret[rkey]={};
            }
        }
    }
    catch(err){     
        showtime.trace("Unknown error occurred: "+err);
        oret = {
            'content': '',
      	    'headers':'',
      	    'geturl':'',
      	    'cookies':''
        }
    }
    return oret;
}


function NIPLVars(){
    this.defaults=NIPLVars_defaults;
    this.reset=NIPLVars_reset;
    
    this.data=this.defaults();
}

    function NIPLVars_defaults(){
        return {
            'htmRaw':'',
            's_url':'',
            'regex':'',
            's_method':'get',
            's_action':'read',
            's_agent':'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.0.4) Gecko/2008102920 Firefox/3.0.4',
            's_referer':'',
            's_cookie':'',
            's_postdata':'',
            'url':'',
            'swfplayer':'',
            'playpath':'',
            'agent':'',
            'pageurl':'',
            'app':'',
            'swfVfy':'',
            'nookie_expires':'0'
        }
    }
    
    function NIPLVars_reset(rtype){
        var v_defaults=this.defaults();
        var v_subdefaults=[
            's_method','s_action','s_agent','s_referer','s_cookie','s_postdata'
        ];
        if (rtype=="scrape"){
            for each (ke in v_subdefaults)
                this.data[ke]=v_defaults[ke];
        }
        else if (rtype=="hard")
            this.data=this.defaults();
        else{
            for each (var ke in v_defaults)
                this.data[ke]=v_defaults[ke];
        }
    }


/*--------------------------------------------------------------------
# Description: Text viewer
/*------------------------------------------------------------------*/
function CServer() {
    //public member of CServer class.
    this.user_id = '';
    
    this.login = CServer_login;
    this.is_user_logged_in = CServer_is_user_logged_in;
    
    this.login();
}

    /*--------------------------------------------------------------------
    # Description: -
    # Parameters : -
    # Return     : -
    /*------------------------------------------------------------------*/            
    function CServer_login() {
        if(this.is_user_logged_in())      
            return false;    
        
        var reason = "Login required";    
        var do_query = false;    
        while(1) {      
            var credentials = plugin.getAuthCredentials("Headweb streaming service",	
            reason, do_query);          
            
            if(!credentials) {	
                if(!do_query) {	  
                    do_query = true;	  
                    continue;	
                }	
                return "No credentials";      
            }      
            if(credentials.rejected)	
                return "Rejected by user";      
            var v = showtime.httpPost("http://navix.turner3d.net/login/", {	
                username: credentials.username,	password: credentials.password      
            });            
            var doc = v.toString();            
            if(doc == '') {	
                reason = 'Login failed, try again';	
                continue;      
            }      
            showtime.trace('Logged in to Headweb as user: ' + credentials.username);
            this.user_id = v.toString();
            return false;    
        }
    }    
    
    /*--------------------------------------------------------------------
    # Description: -
    # Parameters : -
    # Return     : -
    /*------------------------------------------------------------------*/             
    function CServer_is_user_logged_in() {
        if (this.user_id != '')
            return true;  
        return false;
    }
    
plugin.addURI(PREFIX + ":start", startPage);
})(this);
