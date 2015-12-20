/*
---
description: The Wall is a plugin for Mootools javascript framework designed to create walls of infinite dimensions. Its flexibility allows different applications, from infinite wall mode to Coda slider mode. The Wall creates compatible interfaces with the newer browsers and mobile devices.

license: MIT-style

authors:
- Marco Dell'Anna

requires:
- core/1.3: '*'

provides:
- The Wall
...
*/

/*
 * Mootools The Wall
 * Version 1.0
 * Copyright (c) 2011 Marco Dell'Anna - http://www.plasm.it
 *
 * Inspiration:
 * - Class implementation inspired by [Infinite Drag] (http://ianli.com/infinitedrag/) by Ian Li, Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 *
 * Requires:
 * MooTools http://mootools.net
 *
 * Permission is hereby granted, free of charge, to any person
 * obtaining a copy of this software and associated documentation
 * files (the "Software"), to deal in the Software without
 * restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following
 * conditions:
 *
 * The above copyright notice and this permission notice shall be
 * included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
 * OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 * NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 * OTHER DEALINGS IN THE SOFTWARE.
 *
 * Log:
 * 1.1 - Inserito onResize Windows
 * 1.0 - Inizio implementazione release stabile
 */
 
 
 
var Wall = new Class({
    __target: undefined,
    init : false,
    Implements : Options,
    id   : 0, // ID Elemento Attivo
    coordinates :[],
    wall : undefined,
    viewport : undefined,
    grid : [],
    minx : 0,
    maxx : 0,
    wallFX : undefined,
    slideshowInterval:undefined,
    options : {
        printCoordinates : false,             // Inserisce le coordinate nel tile
        speed            : 1000,              // Velocità spostamento
        transition       : Fx.Transitions.Quad.easeOut,
        autoposition     : false,             // Autoposizionamento wall
        draggable        : true,              // Abilita drag
        inertia          : false,             // Abilita inertia
        invert           : false,             // Inverte direzione drag
        width            : 0,                 // W tile
        height           : 0,                 // H tile
        startx           : 0,                 // Tile iniziale
        starty           : 0,                 // Tile iniziale
        rangex           : [-500, 500],       // Definisce il numero di colonne (non pixel)
        rangey           : [-500, 500],       // Definisce il numero di righe (non pixel)
        handle           : undefined,         // Definisce un differente handle
        slideshow        : false,             // Abilita Slideshow Wall
        showDuration     : 3000,              // Durata visualizzazione Slideshow
        preload          : false,             // Precarica contenuto
        callOnUpdate     : Function,          // Azione on drag/complete
        callOnChange     : Function,          // Azione scatenata quando viene impostato id elemento attivo
        detectMobile     : true               // Detect mobile device
    },

    initialize : function(id, options) {
        // Set opzioni
        this.setOptions(options);
        this.__target   = id;
        // Imposta wall e Viewport
        this.wall       = document.id(this.__target);
        this.viewport   = document.id(this.__target).getParent();
    },
    
    /**
     * Initialize The Wall
     */
    initWall : function() {
        // Calcola tutte le coordinate
        this.coordinates = this.calculateCoordinates();
        // Prepopolate
        if( this.options.preload == true ) this.preloadContent();
        // Calcola Spostamento Min e Max per Assi X,Y
        var bb = this.setBoundingBox();
        // Imposta Coordiname BB
        this.maxx = bb.maxx;
        this.maxy = bb.maxy;
        this.minx = bb.minx;
        this.miny = bb.miny;
        
        // Verifica Init Class
        if( this.init == false ){
            // Definisce Effetto di spostamento
            this.wallFX = new Fx.Morph(this.wall, {
                duration: this.options.speed,
                transition: this.options.transition,
                onStart: function(){
                  /*periodicalID = (function(){ 
                      this.options.callOnUpdate(this.updateWall());
                  }).periodical(Math.floor(this.options.speed/4), this);*/
                }.bind( this ),
                onComplete: function(){
                    this.options.callOnUpdate(this.updateWall());
                   // clearTimeout(periodicalID);
                }.bind( this )
            });
            // Inizializza Resize Windows
            window.addEvent('resize', function(){ this.options.callOnUpdate(this.updateWall()); }.bind( this ));

            // Inizializza Class
            this.init = true;
        }else{
            // Sgancia elemento solo se draggabile
            if( this.options.draggable == true ) this.wallDrag.detach();
        }

        // Definisce Handler
        var handler = this.options.handle != undefined ? document.id(this.options.handle) : document.id(this.__target);
        // Click sul Wall
        document.id(this.__target).addEvent("click", function(e){
            e.stopPropagation();
            // Reset Movement
            this.moved = 0;
        }.bind( this ))
        
        // Definisce oggetto draggabile
        if( this.options.draggable == true ){
            this.wallDrag = document.id(this.__target).makeDraggable({
                handle:handler,
                limit: {
                            x: [this.minx-this.options.width, this.maxx],
                            y: [this.miny-this.options.height, this.maxy]
                        },
                invert:this.options.invert,
                onStart: function(el, e){
                    clearTimeout(this.periodicalID);
                    // Reset Movement
                    this.moved = 0;
                    // Posizione Inizio Drag
                    this.xPos = e.page.x;
                    this.yPos = e.page.y;
                }.bind( this ),
                onDrag: function(el, e){
                    this.xspeed = e.page.x - this.xPos; // x mouse speed
                    this.yspeed = e.page.y - this.yPos; // y mouse speed
                    this.xPos   = e.page.x;
                    this.yPos   = e.page.y;
                    //
                    e.stopPropagation();
                    // Interrompe Slideshow
                    this.clearSlideShow();
                    // Tronca transizione se riparte il drag
                    if( this.wallFX ) this.wallFX.cancel();
                    this.options.callOnUpdate(this.updateWall());
                    // Considera movimento
                    this.moved++;
                }.bind( this ),
                onComplete: function(el, e){
                    e.preventDefault();
                    // Verifica inertia
                    if( this.options.inertia == true ){
                        // START Inertia
                        this.periodicalID = (function(){ 
                            if( this.options.invert == true ){
                                var finX = this.wall.getStyle("left").toInt() - this.xspeed;
                                var finY = this.wall.getStyle("top").toInt()  - this.yspeed;
                            }else{
                                var finX = this.wall.getStyle("left").toInt() + this.xspeed;
                                var finY = this.wall.getStyle("top").toInt()  + this.yspeed;
                            }
                            if( finX < 0) this.wall.setStyle("left", Math.max(this.minx, finX));
                            if( finY < 0) this.wall.setStyle("top",  Math.max(this.miny, finY));
                            if( finX > 0) this.wall.setStyle("left", Math.min(this.maxx, finX));
                            if( finY > 0) this.wall.setStyle("top",  Math.min(this.maxy, finY));
                            
                            // Decrementa velocità di spostamento
                            this.xspeed *= 0.9;
                            this.yspeed *= 0.9;
                            // Aggiorna Wall
                            this.options.callOnUpdate(this.updateWall());
                            // Interrompe spostamento se prossimo a 0.6
                            if (Math.abs(this.xspeed) < 2 && Math.abs(this.yspeed) < 2) {
                                // Attiva elemento del coda, se presente
                                var p = this.calculateProximity();
                                // Calcola l'id in base alle coordinate
                                this.id = this.getIdFromCoordinates(p.c,p.r);
                                // Attiva elemento del coda
                                this.codaActiveItem(this.id);
                                this.options.callOnUpdate(this.updateWall());
                                // Ricalcola posizione
                                if( this.options.autoposition == true ) this.normalizePosition();
                                // Clear Periodical
                                clearTimeout(this.periodicalID);
                            }
                        }).periodical(20, this);
                        // END Inertia
                    }
                    // Riposizionamento automatico
                    if( this.options.autoposition == true && this.options.inertia == false){
                        // Riposiziona, se richiesto e se lo slideshow è terminato
                        if( this.slideshowInterval == undefined || this.options.slideshow == false ) this.normalizePosition();
                    }else{
                        // Attiva elemento del coda, se presente
                        var p = this.calculateProximity();
                        // Calcola l'id in base alle coordinate
                        this.id = this.getIdFromCoordinates(p.c,p.r);
                        // Attiva elemento del coda
                        this.codaActiveItem(this.id);
                    }
                    // Callback wall    
                    this.options.callOnUpdate(this.updateWall());
                }.bind( this )
            });
            // Imposta Cursore
            this.wall.setStyle("cursor", "move");
            // Scarica Prediodical
            this.wallDrag.addEvent("mousedown", function(e){
                e.stop();
                clearTimeout(this.periodicalID);
                e.stopPropagation();
            }.bind(this));
        }else{
            // Imposta Cursore default
            this.wall.setStyles({
                                    "cursor":"default",
                                    "position":"absolute"
                                });            
        }

        // Imposta posizione iniziale
        this.wall.setStyles({
            "left": this.options.startx*this.options.width,
            "top": this.options.starty*this.options.height
        })
        
        // Aggiorna Wall ed esegue CallBack di creazione
        this.options.callOnUpdate(this.updateWall());

        // Inizializza Slideshow
        if( this.options.slideshow == true ) this.initSlideshow();
       
        // Inizializza Device Mobile
        if( this.options.detectMobile && this.detectMobile() && this.options.draggable == true ) this.initMobile();

        //
        return this;
    },
    
    /**
     * Verifica se il Wall si è spostato
     * @return boolean
     */
    getMovement: function(){
        var m = this.moved > 0 ? true : false;
        // Resetta variabile movimento
        this.moved = 0;
        return m;
    },
    
    /**
     * @PRIVATE
     * Calcola lo spazio di contenimento del wall e il relativo spostamento
     * @return oggetto {minx, miny, maxx, maxy}
     */
    setBoundingBox: function(){
        // Estrae Coordinate Viewport
        var vp_coordinate = this.viewport.getCoordinates();
        // Tile Size
        var tile_w = this.options.width;
        var tile_h = this.options.height;
        // Viewport Size
        var vp_w = vp_coordinate.width;
        var vp_h = vp_coordinate.height;
        var vp_cols   = Math.ceil(vp_w / tile_w);
        var vp_rows   = Math.ceil(vp_h / tile_h);
        // Calcola X min e X max
        var maxx = Math.abs(this.options.rangex[0]) * tile_w;
        var maxy = Math.abs(this.options.rangey[0]) * tile_h;
        var minx = -( (Math.abs(this.options.rangex[1])) * tile_w ) + vp_w;
        var miny = -( (Math.abs(this.options.rangey[1])) * tile_h ) + vp_h;
        return {"minx":minx,"miny":miny,"maxx":maxx,"maxy":maxy}
    },

    /**
     * @PRIVATE
     * Calcola tutte le coordinate possibili del Wall
     * @return array di oggetti {colonna, riga}
     */
    calculateCoordinates: function(){
        var indice      = 0;
        var coordinates = [];
        for(var r=this.options.rangey[0]; r<this.options.rangey[1]; r++){
            for(var c=this.options.rangex[0]; c<this.options.rangex[1]; c++){
                coordinates[indice] = {"c":c, "r":r};
                if(c==0&&r==0){ this.id = indice; }
                indice++;
            }
        }
        return coordinates;
    },
    
    /**
     * Estrae id da Coordinate spaziali
     * @return numeric id
     */
    getIdFromCoordinates: function(gc,gr){
        var indice = 0;
        for(var r=this.options.rangey[0]; r<this.options.rangey[1]; r++){
            for(var c=this.options.rangex[0]; c<this.options.rangex[1]; c++){
                if(c==gc&&r==gr){ return indice; }
                indice++;
            }
        }
        return indice;
    },
    
    /**
     * Restituisce le coordinate del tassello richiesto
     * @return object o.c, o.r
     */
    getCoordinatesFromId: function(id){
      return this.coordinates[id];
    },
    
    /**
     * Restituisce id elemento attivo
     * @return numeric
     */
    getActiveItem: function(){
        return this.id;
    },
    
    /**
     * @PRIVATE
     * Calcola la posizione più prossima al punto raggiunto
     * @return Object - Coordinate del punto
     */
    calculateProximity: function(){
        var wallx = this.wall.getStyle("left").toInt()*-1;
        var wally = this.wall.getStyle("top").toInt()*-1;
        var w     = this.options.width;
        var h     = this.options.height;
        // Calcola posizione
        var npx = Math.round(wallx/w);
        var npy = Math.round(wally/h);
        return {"c":npx, "r":npy};
    },

    /**
     * @PRIVATE
     * Normalizza la posizione del Wall se è impostato il settaggio "autoposition"
     * @return
     */
    normalizePosition: function(){
        var p = this.calculateProximity();
        // Sposta al punto
        this.moveTo(p.c, p.r);
        return;
    },
    
    /**
     * @PRIVATE
     * Aggiorna gli elementi del wall. Calcola gli elementi visibili non ancora generati
     * @return array new nodes
     */
    updateWall: function(){
        // Array Nodes
        var newItems = [];
        // Estrae Coordinate Wall e Viewport
        var vp_coordinate   = this.viewport.getCoordinates();
        var wall_coordinate = this.wall.getCoordinates();

        // Tile Size
        var tile_w = this.options.width;
        var tile_h = this.options.height;
        
        // Viewport Size
        var vp_w = vp_coordinate.width;
        var vp_h = vp_coordinate.height;
        var vp_cols   = Math.ceil(vp_w / tile_w);
        var vp_rows   = Math.ceil(vp_h / tile_h);

        // Ricalcola bounding
        // Calcola Spostamento Min e Max per Assi X,Y
        var bb = this.setBoundingBox();
        // Imposta Coordiname BB
        this.maxx = bb.maxx;
        this.maxy = bb.maxy;
        this.minx = bb.minx;
        this.miny = bb.miny;
        
        // Aggiorna dim viewport
        if(this.options.draggable == true) this.wallDrag.options.limit.x = [this.minx - this.options.width, this.maxx]
        if(this.options.draggable == true) this.wallDrag.options.limit.y = [this.miny - this.options.height, this.maxy]

        // Posizioni
        var pos = {
            left: wall_coordinate.left - vp_coordinate.left,
            top:  wall_coordinate.top  - vp_coordinate.top
        }
        
        // Calcola visibilità elemento
        var visible_left_col = Math.ceil(-pos.left / tile_w)  - 1;
        var visible_top_row  = Math.ceil(-pos.top /  tile_h)  - 1;

        for (var i = visible_left_col; i <= visible_left_col + vp_cols; i++) {
            for (var j = visible_top_row; j <= visible_top_row + vp_rows; j++) {
                if (this.grid[i] === undefined) {
                    this.grid[i] = {};
                }
                if (this.grid[i][j] === undefined) {
                    var item = this.appendTile(i, j);
                    if( item.node !== undefined )  newItems.push(item);
                }
            }
        }
        
        // Update viewport info.
        wall_width  = wall_coordinate.width;
        wall_height = wall_coordinate.height;
        wall_cols = Math.ceil(wall_width  / tile_w);
        wall_rows = Math.ceil(wall_height / tile_h);
        
        return newItems;
    },
    
    /**
     * @PRIVATE
     * Aggiunge un elemento al Wall
     * @return object {nodo_Dom, x, y}
     */
    appendTile: function(i,j){
        this.grid[i][j] = true;
        
        // Tile Size
        var tile_w = this.options.width;
        var tile_h = this.options.height;
        // Valori Min/Max
        var range_col = this.options.rangex;
        var range_row = this.options.rangey;
        if (i < range_col[0] || (range_col[1]) < i) return {};
        if (j < range_row[0] || (range_row[1]) < j) return {};
        
        var x    = i * tile_w;
        var y    = j * tile_h;
        var e    = new Element("div").inject(this.wall);
            e.setProperties({
                "class": "tile",
                "col": i,
                "row": j,
                "rel": i+"x"+j
            }).setStyles({
                "position": "absolute",
                "left": x,
                "top": y,
                "width": tile_w,
                "height": tile_h
            })
            if( this.options.printCoordinates ) e.set("text", i+"x"+j);
            return {"node":e, "x":j, "y":i};
    },
    
    /**
     * Esegue operazione di alimentazione massificata eseguendo la generazione di tutti i tasselli
     * Azione applicabile al coda, sconsigliato su wall di grandi dimensioni
     */
    preloadContent: function(){
        // Array Nodes
        var newItems = [];
        Object.each(this.coordinates, function(e){
            if (this.grid[e.c] === undefined) this.grid[e.c] = {};
                var item = this.appendTile(e.c, e.r);
                    newItems.push(item);
        }.bind(this))
        // Popola tutto il wall
        this.options.callOnUpdate(newItems);
        return newItems;
    },
    
    /**
     * Imposta CallBack di di inizializzazione tile del Wall
     */
    setCallOnUpdate: function(f){
        this.options.callOnUpdate = f;
        return f;
    },
    
    /**
     * Imposta CallBack di aggiornamento focus elemento
     */
    setCallOnChange: function(f){
        this.options.callOnChange = f;
        return f;
    },

    /**
     * @PRIVATE
     * Inizializza Slideshow
     * Lo slideshow viene interrotto al Drag o Touch
     */
    initSlideshow: function(){
        // Controllo Speed
        if( this.options.slideshow == true ){
          if( this.options.showDuration < this.options.speed ) this.options.showDuration = this.options.speed;
          this.slideshowInterval = this.getAutomaticNext.periodical(this.options.showDuration, this );
        }
    },
    
    /**
     * @PRIVATE
     * Richiede elemento successivo nel coda Slideshow
     * return
     */
    getAutomaticNext: function(){
        this.clearSlideShow();
        if( this.options.slideshow == true ){
            this.slideshowInterval = this.getAutomaticNext.periodical(this.options.showDuration, this );
        }
        // Verifica elemento
        1+this.id > this.coordinates.length-1 ? this.id = 0 : this.id++;
        this.moveTo(this.coordinates[this.id].c, this.coordinates[this.id].r); // Richiede prossima slide
    },

    /**
     * @PRIVATE
     * Interrompe Slideshow
     * return
     */
    clearSlideShow: function(){
        clearTimeout(this.slideshowInterval);
        this.slideshowInterval = undefined;
    },
    
    /**
     * Esegue spostamento del Wall alle coordinate indicate
     * return false || nodo Dom attivo
     */
    moveTo: function(c,r){

        // Verifica validità valori possibile e valore indicato
        if( c < 0 ) c = Math.max(c, this.options.rangex[0]);
        if( c > 0 ) c = Math.min(c, this.options.rangex[1]);
        if( r < 0 ) r = Math.max(r, this.options.rangey[0]);
        if( r > 0 ) r = Math.min(r, this.options.rangey[1]);

        // Esegue Morph
        this.wallFX.cancel().start({
            'left': Math.max(-(c*this.options.width), this.minx),
            'top':  Math.max(-(r*this.options.height), this.miny)
        });
        
        // Calcola l'id in base alle coordinate
        this.id = this.getIdFromCoordinates(c,r);

        // Attiva elemento del coda
        this.codaActiveItem(this.id);
        //
        var name = this.coordinates[this.id].c+"x"+this.coordinates[this.id].r;
        var item = $$("#"+this.__target+" div[rel="+name+"]");
        if( item.length > 0) return $$("#"+this.__target+" div[rel="+name+"]")[0];
        return false;
    },
    
    /**
     * Posiziona il Wall su elemento attivo
     * return Object node Dom elemento con focus di posizionamento
     */
    moveToActive: function(){
        // Muove il Wall alle coordinate del tile con id attivo
        return this.moveTo(this.coordinates[this.id].c, this.coordinates[this.id].r)
    },
    
    /**
     * Posiziona il Wall su elemento successivo
     * return Object node Dom elemento con focus di posizionamento
     */
    moveToNext: function(){
        this.clearSlideShow();
        if( 1+this.id < this.coordinates.length ){ this.id++; }
        return this.moveTo(this.coordinates[this.id].c, this.coordinates[this.id].r)
    },

    /**
     * Posiziona il Wall su elemento precedente
     * return Object node Dom elemento con focus di posizionamento
     */
    moveToPrev: function(){
        this.clearSlideShow();
        if( (this.id-1) >= 0 ){ this.id--; }
        return this.moveTo(this.coordinates[this.id].c, this.coordinates[this.id].r)
    },
    
    /**
     * Richiede la lista dei punti sotto forma di Link
     * @target: ID DOM element dove inserire i links
     * @return array list element
     */
    getListLinksPoints: function( id_target ){
        var items = [];
        // Crea Hyperlink per ogni elemento del Wall
        Array.each(this.coordinates, function(e,i){
            var a = new Element("a.wall-item-coda[html="+(1+i)+"][href=#"+(1+i)+"]");
                a.addEvent("click", function(evt){
                    // Disabilita slideshow
                    this.clearSlideShow();
                    this.id = i;
                    this.codaActiveItem(i);
                    evt.stop();
                    this.moveTo(e.c, e.r);
                }.bind( this ))
                a.addEvent("touchend", function(evt){
                  this.fireEvent("click", evt)
                })
                // Inserisce nel target
                a.inject(document.id(id_target));
                // Aggiunge ad array elementi
                items.push(a);
        }.bind( this ))
        // Imposta id coda target
        this.coda_target = id_target;
        // Imposta lista elementi del coda
        this.coda_items  = items;
        // Imposta attivo il primo elemento del coda
        this.codaActiveItem(0);
        return items;
    },

    /**
     * @PRIVATE
     * Attiva Elemento del Coda console
     * @i indice dell'elemento cliccato 1,2,3,4,5
     * @return node Dom element
     */
    codaActiveItem: function(i){
        // Esegue CallBack
        this.options.callOnChange(i);
        // Attivazione
        if( this.coda_target ){
            // Rimuove link attivi
            Array.each(this.coda_items, function(e,i){ e.removeClass("wall-item-current"); })
            // Attiva corrente
            this.coda_items[i].addClass("wall-item-current");
            return this.coda_items[i];
        }
    },
    
    /**
     * @PRIVATE
     * Esegue Detect Mobile Devices based on http://detectmobilebrowsers.com/ list
     * @return boolean
     */
    detectMobile: function(){
        var ua = navigator.userAgent || navigator.vendor || window.opera;
        var isMobile = /(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(ua)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(ua.substr(0,4))
        return isMobile;
    },
    
    /**
     * @PRIVATE
     * Inizializza comportamenti per il magico ditino
     */
    initMobile: function(){
        // Touch Start Slider
        this.wall.__root = this
        this.wall.addEvent('touchstart',function(e) {
            if( e ) e.stop();
            
            // Interrompe Slideshow
            this.__root.clearSlideShow();
            
            // Data Start
            this._startXMouse = e.page.x;
            this._startYMouse = e.page.y;
            this._startLeft   = this.getStyle("left").toInt();
            this._startTop    = this.getStyle("top").toInt();
            this._width       = this.getStyle("width").toInt();
            this._height      = this.getStyle("height").toInt();
        });

        // Touch Move Slider
        this.wall.addEvent('touchmove',function(e) {
            if( e ) e.stop();
            // Horizontal
            var _deltax = this._startXMouse - e.page.x;
            var _x      = this.getStyle("left").toInt();

            if( _x  > Math.min(this.__root.minx, 0) ){
                endx = Math.min(this._startLeft - _deltax, this.__root.maxx)
            }else{
                endx = Math.max( this.__root.minx, this._startLeft - _deltax)
            }
            // Imposta posizione X
            if( endx <= this.__root.maxx) this.setStyle("left",  endx );
            
            // Vertical
            var _deltay = this._startYMouse - e.page.y;
            var _y  = this.getStyle("top").toInt();

            if( _y  > Math.min(this.__root.miny, 0) ){
                endy = Math.min(this._startTop - _deltay, this.__root.maxy)
            }else{
                endy = Math.max( this.__root.miny, this._startTop - _deltay)
            }
            // Imposta posizione Y
            if( endy <= this.__root.maxy) this.setStyle("top",  endy );
            
            // Aggiorna Wall ed esegue CallBack di creazione
            this.__root.options.callOnUpdate(this.__root.updateWall());
        });

        // Touch Move End
        this.wall.addEvent('touchend',function(e) {
            if( this.options.autoposition == true){
                // Riposiziona, se richiesto e se lo slideshow è terminato
                if( this.slideshowInterval == undefined || this.options.slideshow == false ) this.normalizePosition();
            }else{
                // Attiva elemento del coda, se presente
                var p = this.calculateProximity();
                // Calcola l'id in base alle coordinate
                this.id = this.getIdFromCoordinates(p.c,p.r);
                // Attiva elemento del coda
                this.codaActiveItem(this.id);
            }
            // Aggiorna Wall ed esegue CallBack di creazione
            this.options.callOnUpdate(this.updateWall());
        }.bind(this));
    }
});
