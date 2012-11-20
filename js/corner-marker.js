/**
 +==================================+
 | Corner Marker by Andrew Perlitch |
 +==================================+
 * A CAD web app that reads PatternSmith (psxml) files &
 * allows users to put markers on pattern corners, with 
 * additional basic functionality.
 * 
 * Dependencies:
 * -------------
 *  - jQuery (1.7+)
 *  - jQuery UI (1.9) + theme
 *  - Pines Notify (1.2+) (http://pinesframework.org/pnotify)vvv
*/

// ----------------------------------
//  Global Variables
// ----------------------------------

// array holding keypress events 
// past to global scope (eg. shift)
var keysOn = [];

// Object to hold application settings
var cm_settings = {
    
    "general":{
        "max_frame_rate":50,
        "move_sensitivity":0.5
    },
    "canvas":{
        
        "background_color":"#000000",
        "point_color":"#DDD",
        "point_diameter":4,
        "padding":[50,50],
        "marquee_color":"#CCC"
        
    },
    "tools":{
        "zoom":{
            "zoom_amt":0.2,
            "mousewheel_amt":0.5
        },
        "cursor":{
            "max_items_with_points":400,
            "click_radius":6,
            "min_marquee_area":16
        },
        "mark":{
            "min_corner_angle":30,
            "default_label_height":0.375,
            "default_edge_distance":0.125,
            "same_point_tolerance":0.01,
            "max_mark_chars":3
        }
    },
    "plottypes":{
        "default":{
            display_name:"Default",
            inactive:"#",
            enable:false,
            display:true
        },
        "plot":{
            display_name:"Plot",
            inactive:"#00CC00",
            active:"#00FF00",
            enable:true,
            display:true
        },
        "ref":{
            display_name:"Reference",
            inactive:"#CCCC00",
            active:"#FFFF00",
            enable:false,
            display:true
        },
        "cut":{
            display_name:"Cut",
            inactive:"#CC0000",
            active:"#FF0000",
            enable:true,
            display:true
        },
        "cut2":{
            display_name:"Cut 2",
            inactive:"#8800FF",
            actived:"#CC00FF",
            enable:true,
            display:true
        }
    }
}

// Holds the man <canvas> DOM element
var cm_canvas;

// Object that holds all tool objects
var cm_tools = {};

// Current canvas coordinates of mouse
var cm_mouse = [0,0];

// Flag for if there is a cursor point to check
var cm_cursor_point = false;

// Holds global handlers
var cm_handlers = {
    
    lastTool:"cursor",
    
    onkeydown:{
        // Shift
        16:function(evt)
        {
            cm_handlers.shift_is_down = true;
        },
        // Space bar
        32:function(evt)
        {
            return cm_handlers.setToolToKey("hand");
        },
        // v
        86:function(evt)
        {
            return cm_handlers.setToolToKey("cursor");
        },
        // h
        72:function(evt)
        {
            return cm_handlers.setToolToKey("hand");
        },
        // z
        90:function(evt)
        {
            return cm_handlers.setToolToKey("zoom");
        },
        // option
        18:function(evt)
        {
            return cm_handlers.setToolToKey("zoom");
        },
        // delete
        8:function(evt)
        {
            evt.preventDefault();
        },
        // cmd
        91:function(evt)
        {
            cm_handlers.setToolToKey("mark");
            return false;
        }
    },
    
    setToolToKey:function(tool)
    {
        if (currentTool.name == tool) return;
        cm_handlers.lastTool = currentTool.getName();
        setCurrentTool(tool);
    },
    
    onkeyup:{
        // Space bar
        32:function(evt)
        {
            setCurrentTool(cm_handlers.lastTool);
        },
        // option
        18:function(evt)
        {
            setCurrentTool(cm_handlers.lastTool);
        },
        // shift
        16:function(evt)
        {
            cm_handlers.shift_is_down = false;
        },
        // c
        91: function(evt)
        {
            setCurrentTool(cm_handlers.lastTool);
        }
    },
    
    keydown:function(evt){
        keysOn[evt.keyCode] = true;
        if (typeof cm_handlers.onkeydown[evt.keyCode] == "function")
        {
            cm_handlers.onkeydown[evt.keyCode](evt);
        }
        else
        {
            console.log("handler for key not found: ", evt.keyCode);
        }
    },
    keyup:function(evt){
        keysOn[evt.keyCode] = false;
        if (typeof cm_handlers.onkeyup[evt.keyCode] == "function")
        {
            cm_canvas.trigger("mouseup");
            cm_handlers.onkeyup[evt.keyCode](evt);
        }
    },
    mousewheel:function(evt)
    {
        // capture x and y change
        var dx = evt.originalEvent.wheelDeltaX,
            dy = evt.originalEvent.wheelDeltaY,
            divisor = ratio * (2/(cm_settings.general.move_sensitivity));
        
        if (cm_handlers.shift_is_down)
        {
            origin[0] += dy/divisor;
            origin[1] += dx/divisor;
        }
        else
        {
            origin[0] += dx/divisor;
            origin[1] += dy/divisor;
        }
        
    },
    mousemove:function(evt)
    {
        cm_mouse[0] = evt.offsetX;
        cm_mouse[1] = evt.offsetY;
    },
    cm:function(evt)
    {
        this.namespaces = {
            deselect:function(evt)
            {
                // Loop through all of cm_selected, deselect, 
                // and remove from cm_selected object
                for (i in cm_selected)
                {
                    cm_selected[i].selected = false;
                    delete cm_selected[i];
                }
                
                cm_helpers.outlines = {};
                
                cm_selected_length = 0;
            }
        }
        
        // Look for namespace handler
        if ( typeof this.namespaces[evt.namespace] == "function") this.namespaces[evt.namespace](evt);
    }
}

// Holds helper objects that get rendered on the screen,
// eg. marquee for selection or zoom box
var cm_helpers = {
    
    outlines:{},
    cursor:{}
    
};

// object that holds all selected items
var cm_selected = {};
var cm_selected_length = 0;

// Holds jQuery object of window
var $win;

// Holds the C2A context
var context;

// Holds current tool object
var currentTool;

// Project object (parsed XML-to-dom-object from psxml)
var project = {
    
    // array of pattern objects
    "patterns": []
    
}
// level to zoom
var zoomLvl = 1;
// Maps file (0,0) to equivalent pixel position,
// such that s2c(origin) = (0,0);
var origin;
// master ratio: number of pixles per unit
var ratio;
// Main game app
var CornerMarker;








// ----------------------------------
//  Canvas Plugins
// ----------------------------------

// Thanks to paul irish for this rAF shim:
window.requestAnimFrame = (function(){
    return  window.requestAnimationFrame       || 
    window.webkitRequestAnimationFrame || 
    window.mozRequestAnimationFrame    || 
    window.oRequestAnimationFrame      || 
    window.msRequestAnimationFrame     || 
    function( callback ){
        window.setTimeout(callback, 1000 / cm_settings.general.max_frame_rate);
    };
})();


// Thanks to Phrogz and Rod MacDougall from StackOverflow.com for this function!
// @see http://stackoverflow.com/questions/4576724/dotted-stroke-in-canvas
var CP = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
if (CP.lineTo) {
    CP.dashedLine = function(x, y, x2, y2, da) {
        if (!da) da = [10,5];
        this.save();
        var dx = (x2-x), dy = (y2-y);
        var len = Math.sqrt(dx*dx + dy*dy);
        var rot = Math.atan2(dy, dx);
        this.translate(x, y);
        this.moveTo(0, 0);
        this.rotate(rot);       
        var dc = da.length;
        var di = 0, draw = true;
        x = 0;
        while (len > x) {
            x += da[di++ % dc];
            if (x > len) x = len;
            draw ? this.lineTo(x, 0): this.moveTo(x, 0);
            draw = !draw;
        }       
        this.restore();
    }
}





// ----------------------------------
//  Global Methods
// ----------------------------------

// Method to set the current tool
function setCurrentTool(tool) 
{
    // Set the data-tool attribute to canvas
    cm_canvas.attr("data-tool",tool);
    
    // Remove .current-tool from any and all elements
    $(".current-tool").removeClass("current-tool");
    
    // add .current-tool class to any .[tool]-tool classes
    $("."+tool+"-tool").addClass("current-tool");
    
    // Set the currentTool to this.
    currentTool = cm_tools[tool];
}
// Compare two image objects (from context.getImageData())
function imageHasChanged(img1,img2)
{
    if(img1.data.length != img2.data.length)
        return true;
    var length = img1.data.length;
    for(var i = 0; i < length; ++i){
        if(img1.data[i] != img2.data[i])
        return true;
    }
    return false;
}
// Cartesian-to-Screen coordinate conversion
function c2s(xy)
{
    return [
        // y = ( A + x )â€¢râ€¢zoomLvl 
        (origin[0] + xy[0]) * ratio * zoomLvl,
        (origin[1] - xy[1]) * ratio * zoomLvl
    ];
}
// Screen-to-Cartesian coordinate conversion
function s2c(xy)
{
    return [
        (xy[0]/ratio*zoomLvl) - origin[0],
        origin[1] - xy[1]/ratio*zoomLvl
    ];
}
// Marks a point on the screen
function markPoint(point, convert, style)
{
    if (point == undefined) 
    {
        console.log("point is undefined");
        return;
    }
    
    // check for conversion
    if (convert) point = c2s(point);
    
    // check for out of bounds
    if (point[0] < 0 || point[0] > cm_canvas.width() || point[1] < 0 || point[1] > cm_canvas.height()) return;
    
    // set color
    context.strokeStyle = "#FFFFFF";
    context.fillStyle = "#FFFFFF";
    context.lineWidth = 1;
    
    // get diameter of point
    var pDiam = cm_settings.canvas.point_diameter;
    var pRadius =  pDiam / 2;
    
    switch(style)
    {
        default:
            context.strokeRect( point[0] -pRadius, point[1] -pRadius, pDiam, pDiam );
        break;
        
        case "circle":
            context.beginPath();
            context.arc(point[0], point[1], pRadius, 360, true);
            context.closePath();
            context.fill();
        break;
    }
}
// Takes an array of two strings and makes both elements numeric
// eg. ["3","4"] => [3,4]
function makePtNumeric(point)
{
    return [ point[0]*1 , point[1]*1 ];
}
// Adds two points together
function addPoints(point1, point2)
{
    var newPoint = [];
    newPoint[0] = point1[0] + point2[0];
    newPoint[1] = point1[1] + point2[1];
    return newPoint;
}
// Subtracts one point from another
function subtractPoint(point1, point2)
{
    var newPoint = [];
    newPoint[0] = point1[0] - point2[0];
    newPoint[1] = point1[1] - point2[1];
    return newPoint;
}
// Checks if the two points are the same
var isSamePoint =  function(point1, point2)
{
    var x_diff, y_diff;
    
    x_diff = Math.abs(point1[0] - point2[0]);
    y_diff = Math.abs(point1[1] - point2[1]);
    return x_diff <= cm_settings.tools.mark.same_point_tolerance && y_diff <= cm_settings.tools.mark.same_point_tolerance;
}
// Rotates a point around the origin
function rotatePt(point, radians)
{
    var s,c,xnew,ynew;
    s = Math.sin(radians);
    c = Math.cos(radians);
    
    // rotate the point
    xnew = point[0] * c - point[1] * s;
    ynew = point[0] * s + point[1] * c;
    
    return [ xnew, ynew ];
}
// Determine if box A and B overlap
function doBoxesOverlap(pointA1, pointA2, pointB1, pointB2)
{
    var
    // Find the center of A
    Acenter = [  (pointA1[0]+pointA2[0])/2  ,  (pointA1[1]+pointA2[1])/2  ],
    // Find width of A
    Awidth = Math.abs(pointA1[0] - pointA2[0]),
    // Find height of A
    Aheight = Math.abs(pointA1[1] - pointA2[1]),
    // Find x radius for A
    Axr = Awidth/2,
    // Find y radius for A
    Ayr = Aheight/2,
    
    
    // Find the center of B
    Bcenter = [  (pointB1[0]+pointB2[0])/2  ,  (pointB1[1]+pointB2[1])/2  ],
    // Find width of B
    Bwidth = Math.abs(pointB1[0] - pointB2[0]),
    // Find height of B
    Bheight = Math.abs(pointB1[1] - pointB2[1]),
    // Find x radius for B
    Bxr = Bwidth/2,
    // Find y radius for B
    Byr = Bheight/2,
    
    // Find horizontal distance between two centers (AB x distance)
    ABxd = Math.abs(Acenter[0] - Bcenter[0]),
    // Find vertical distance between two centers (AB y distance)
    AByd = Math.abs(Acenter[1] - Bcenter[1]),
    // Find sum of x radii (AB x radius)
    ABxr = Axr + Bxr,
    // Find sum of y radii (AB y radius)
    AByr = Ayr + Byr;
    
    // console.log("Acenter: " + Acenter);
    // console.log("Awidth: " + Awidth);
    // console.log("Aheight: " + Aheight);
    // console.log("Axr: " + Axr);
    // console.log("Ayr: " + Ayr);
    // console.log("Bcenter: " + Bcenter);
    // console.log("Bwidth: " + Bwidth);
    // console.log("Bheight: " + Bheight);
    // console.log("Bxr: " + Bxr);
    // console.log("Byr: " + Byr);
    
    
    // Do they overlap?
    return (ABxd <= ABxr && AByd < AByr) || (ABxd < ABxr && AByd <= AByr);
    
}
// Executes callback when one refresh has happend
function afterNextFrame(callBack)
{
    setTimeout(callBack, 1200/cm_settings.general.max_frame_rate);
}
// Get the distance between two points
function distanceBetween(point1, point2)
{
    return Math.sqrt(
        
        // a^2
        Math.pow(point1[0] - point2[0],2)
        +
        // b^2
        Math.pow(point1[1] - point2[1],2)
        
    );
}
// Get the angle of corner using three points
function getRadiansBetweenPts(A,C,B)
{
    var Ap, Cp, tA, tC, theta;
    if (typeof B === "undefined") B = [0,0];
    // Translate so that B is 0,0
    Ap = subtractPoint(A,B);
    Cp = subtractPoint(C,B);
    tA = Math.atan2(Ap[1],Ap[0]);
    tC = Math.atan2(Cp[1],Cp[0]);
    theta = Math.acos( 
        (Ap[0]*Cp[0] + Ap[1]*Cp[1]) / (Math.sqrt( Math.pow(Ap[0],2) + Math.pow(Ap[1],2) ) * Math.sqrt( Math.pow(Cp[0],2) + Math.pow(Cp[1],2) ))
    );
    return theta;
}

// Returns a function for the angle bisecting line of angle ABC
function getAngleBisector(A, C, B, return_object)
{
    var theta_C, theta_A ;
    // console.log("A,C,B: ",A,C,B);
    
    // Translate the points so that origin is 0,0
    var A_prime = subtractPoint(A,B);
    var C_prime = subtractPoint(C,B);
    
    
    theta_A = Math.atan2(A_prime[1],A_prime[0]);
    theta_C = Math.atan2(C_prime[1],C_prime[0]);
    // Get angle between A' and C'
    var theta = getRadiansBetweenPts(A_prime, C_prime);
    var phi, correction = false;
    if (
        // 1st & 3rd quadrant, concave left
        (A_prime[0] > 0 && A_prime[1] > 0 && C_prime[0] < 0 && C_prime[1] && theta_C < (theta_A - Math.PI))
        ||
        (C_prime[0] > 0 && C_prime[1] > 0 && A_prime[0] < 0 && A_prime[1] && theta_A < (theta_C - Math.PI))
        ||
        // 2nd quadrant and negative y
        (A_prime[0] < 0 && A_prime[1] > 0 && C_prime[1] < 0 && theta_C < (theta_A - Math.PI))
        ||
        (C_prime[0] < 0 && C_prime[1] > 0 && A_prime[1] < 0 && theta_A < (theta_C - Math.PI))
    )
    {
        phi = (Math.max(theta_A, theta_C) + theta/2);
        correction = true;
    }
    else
    {
        phi = (Math.min(theta_A, theta_C) + theta/2);
    }
    
    // console.log("theta_A: " + (theta_A * (180/Math.PI)) );
    // console.log("theta_C: " + (theta_C * (180/Math.PI)) );
    // console.log((theta_A - theta_C)*(180/Math.PI));
    // console.log("phi: ",phi*(180/Math.PI));
    // Find unit vector that has angle of phi
    var D = [1];
    // tan(phi) = Dy/Dx
    // Dx = 1
    // var Dy_multiplier = -1;
    D[1] = Math.tan(phi);
    
    // return the function for the line passing trough D and B
    D = addPoints(D, B);
    
    return return_object 
        ? {
            "line": getLineEquation(B, D),
            "theta": theta,
            "phi": phi,
            "theta_A": theta_A,
            "theta_C": theta_C,
            "correction":correction
        }
        : getLineEquation(B, D)
    ;
    
}

function getLineEquation(point1, point2)
{
    var slope = (point2[1] - point1[1])/(point2[0] - point1[0]),
    // y = mx + b  ->  b = y - mx
    b = point1[1] - slope * point1[0];
    
    return function(x){
        return slope * x + b;
    }
}
function normalizeVector(point)
{
    // First get the distance from the origin
    var distance = Math.sqrt( Math.pow(point[0],2) + Math.pow(point[1],2) );
    
    // Return normalized point
    return [ point[0]/distance, point[1]/distance ];
}
function multiplyPoint(point, factor)
{
    return [ point[0]*factor, point[1]*factor ];
}
function averagePoints(point1,point2)
{
    return [ (point1[0] + point2[0])/2, (point1[1] + point2[1])/2 ];
}



// ----------------------------------
//  App Objects
// ----------------------------------

// Pattern object
var Pattern = function(i, $el)
{
    // Set alias to this
    var self = this;
    
    // Set index
    this.index = this.id = i;
    
    // Init items
    this.items = [];
    
    // Store element
    this.$el = $el;
    
    // Set center point for this pattern
    this.center = $el.find("v").attr("d").split(",");
    
    // Set the name of this pattern
    this.name = $el.children().filter('st[d]').attr("d");
    
    // Set the rotation for this pattern
    this.rotation = $el.children("s").attr("d");
    if ( !this.rotation ) this.rotation = 0;
    
    // Check rotation for scientific notation
    var matches = /([+\-]?(?:0|[1-9]\d*)(?:\.\d*)?)[eE]([+\-]?\d+)?/.exec(this.rotation);
    if (matches)
    {
        var base_num = 1*matches[1];
        var exp_num = 1*matches[2];
        this.rotation = base_num * Math.pow(10, exp_num);
    }
    else
    {
        this.rotation = 1 * this.rotation;
    }
    
    // Make center coords numeric
    this.center = [
        this.center[0] * 1, 
        this.center[1] * 1
    ];
    
    // Set master index for PatternItems
    var master_i = 0;
    
    // Get polys
    var $polys = $el.find("poly");
    $polys.each(function(i){
        self.items.push( new Poly(self.index,master_i++,$(this), self.center, self.rotation) );
        
    });
    
    // Get lines
    var $lines = $el.find("line");
    $lines.each(function(i){
       self.items.push( new Line(self.index,master_i++,$(this), self.center, self.rotation) ); 
    });
    
    // Get Textlabeles
    var $texts = $el.find("text");
    $texts.each(function(){
        self.items.push( new Textlabel(self.index,master_i++, $(this), self.center, self.rotation) );
    });
    
    // Get arcs
    var $arcs = $el.find("arc");
    $arcs.each(function(){
        self.items.push( new Arc(self.index, master_i++, $(this), self.center, self.rotation) );
    });
    
    self.master_i = master_i;
}
Pattern.prototype.draw = function()
{
    // markPoint(this.center,true);
    var length = this.items.length;
    for ( var i = 0; i < length; i++ )
    {
        var item = this.items[i];
        item.draw(true);
    }
}
Pattern.prototype.addTextlabel = function($el)
{
    var self = this, new_text = new Textlabel(self.index,self.master_i++,$el, self.center, self.rotation);
    self.items.push( new_text );
    // console.log(self.rotation);
    return new_text;
}
Pattern.prototype.addArc = function($el)
{
    var self = this, new_arc = new Arc(self.index, self.master_i++, $el, self.center, self.rotation);
    self.items.push( new_arc );
    // console.log(self.rotation);
    return new_arc;
}


// PatternItem object (items of the project)
var PatternItem = function(pattern_idx, item_idx, $el, pattern_center, pattern_rotation)
{
    // Check if there are no constructor params
    if (typeof $el == "undefined") return;
    
    // Init points
    this.points = [];
    // Store pattern index, index, id, jQuery object, center, and rotation
    this.pattern_index = pattern_idx;
    this.index = item_idx;
    this.id = pattern_idx + "." + item_idx;
    this.$el = $el;
    this.pattern_center = pattern_center;
    this.pattern_rotation = pattern_rotation;
    
    // Store plot type
    this.linetype = $el.children("e").attr("pt");
    if ( this.linetype == undefined ) this.linetype = "plot";
    
    // Do item-specific setup
    this.setup($el);
    
    // Set default statuses
    this.selected = false;
    this.outline = false;
    
    // If not set already, set the boundaries
    // of this item (on the psxml coordinate plane)
    if (typeof this.min == "undefined")
    {
        this.min = this.points[0].slice();
        this.max = this.points[0].slice();

        var num_points = this.points.length;
        for (var i = 0; i < num_points; i++)
        {
            var point = this.points[i].slice();
            
            // Check for rotation
            if (this.pattern_rotation != 0)
            {
                point = rotatePt(point,this.pattern_rotation);
            }
            
            // Compare coords to min and max
            this.min[0] = Math.min( this.min[0], point[0] );
            this.min[1] = Math.min( this.min[1], point[1] );
            this.max[0] = Math.max( this.max[0], point[0] );
            this.max[1] = Math.max( this.max[1], point[1] );
        }
        // Add center to these mins and maxs
        // console.log(this.min, this.max);
        this.min[0] += this.pattern_center[0];
        this.min[1] += this.pattern_center[1];
        this.max[0] += this.pattern_center[0];
        this.max[1] += this.pattern_center[1];
        // console.log(this.min, this.max);
        // console.log(this.pattern_center);
    }
    
}
PatternItem.prototype.shouldDisplay = function()
{
    // Check if this draw type should be displayed
    if (!cm_settings.plottypes[this.linetype]["display"]) return false;
    
    return true;
}
PatternItem.prototype.startStroke = function()
{
    // Set stroke style based on this.linetype
    context.lineWidth = this.selected ? 2 : 1;
    context.strokeStyle = this.selected ? cm_settings.plottypes[this.linetype]["active"] : cm_settings.plottypes[this.linetype]["inactive"] ;
    // Start path
    context.beginPath();
    // Reset cPoints in case this has changed
    this.cPoints = false;
}
PatternItem.prototype.endStroke = function(render)
{
    // @param render  function      the function to execute in order to actually draw this thing
    
    var self = this;
    // Check for cursor looking for point on a line
    if (
        cm_cursor_point // user has set down a selection marquee
        && 
        typeof cm_helpers["cursor-marquee"] == "object" // make SURE the marquee is there
        &&
        cm_settings.plottypes[this.linetype]["enable"] // this linetype is selectable
        &&
        cm_helpers["cursor-marquee"].overlapsWith( this.min, this.max )
    ){
        
        var isInMarqueeRange = false;
        
        // Check if this boundaries are inside marquee (less computing)
        if (cm_helpers["cursor-marquee"].containsBox( this.min, this.max ))
        {
            isInMarqueeRange = true;
            render.call(this);
        }
        else // not contained, check if overlapping
        {
            // Get old image of cursor
            // console.log("getting old image");
            var oldImg = cm_helpers["cursor-marquee"].getImgData(),
                newImg;

            // Render item
            render.call(this);

            // Get new hash
            // console.log("getting new image");
            newImg = cm_helpers["cursor-marquee"].getImgData();
            
            // Do the check
            isInMarqueeRange = imageHasChanged(oldImg,newImg);
        }
        
        // Is this item within the marquee range?
        if (isInMarqueeRange) 
        {
            // if marquee is small, disable search for more items
            if (cm_helpers["cursor-marquee"].getArea() < Math.pow(cm_settings.tools.cursor.min_marquee_area,2))
            {
                cm_cursor_point = false;
                this.rendered_selected = false;
            }
            
            if (this.selected && keysOn[16] && !this.rendered_selected)
            {
                this.selected = false;
                delete cm_selected[this.id];
                --cm_selected_length;
            }
            else
            {
                this.selected = true;
                if (typeof cm_selected[this.id] !== "object")
                {
                    cm_selected[this.id] = this;
                    ++cm_selected_length;
                }
            }
            
            // Trigger change on next available cycle
            setTimeout(function(){cm_canvas.trigger("cm.change");},1000/cm_settings.general.max_frame_rate);
            
        }
    }
    else 
    {
        // if (this instanceof Textlabel) console.log("here");
        render.call(this);
    }
    
    // If selected, draw points (as long as there's not too many selected)
    if (this.selected)
    {
        if ( cm_selected_length <= cm_settings.tools.cursor.max_items_with_points )
        {
            // get points in canvas 
            this.cPoints = this.points2canvas();
            // mark all but last one
            for (var i = 0; i < this.cPoints.length - 1; i++)
            {
                markPoint(this.cPoints[i]);
            }
            // make the last one a solid circle
            markPoint(this.cPoints[i],false,"circle");
        }
        
        this.rendered_selected = true;
    }
    
    if (this.outline)
    {
        // Create marquee object
        cm_helpers["outlines"]["outline_"+self.id] = new Marquee(c2s(this.min), c2s(this.max));
        this.outline = false;
    }
    else if (cm_helpers["outlines"]["outline_"+self.id])
    {
        cm_helpers["outlines"]["outline_"+self.id].setStartCorner(c2s(this.min)).setEndCorner(c2s(this.max));
    }
}
PatternItem.prototype.points2canvas = function()
{
    if (this.cPoints) return this.cPoints;
    var cPoints = [];
    for(var i = 0; i < this.points.length; i++)
    {
        // Make copy of point from points
        var point = this.points[i].slice();
        
        // Check for rotation
        if (this.pattern_rotation != 0)
        {
            // console.log(pattern_rotation);
            point = rotatePt( point, this.pattern_rotation );
        }

        // Add these coords to center of this pattern
        point[0] += this.pattern_center[0];
        point[1] += this.pattern_center[1];
    
        // Convert point to screen coordinates
        cPoints.push(c2s(point));
    }
    return cPoints;
}



// Polyline object (drawable)
var Poly = function(pattern_idx, item_idx, $el, pattern_center, pattern_rotation)
{
    PatternItem.call(this, pattern_idx, item_idx, $el, pattern_center, pattern_rotation);
}
Poly.prototype = new PatternItem();
Poly.prototype.setup = function($el)
{
    // Save alias to this
    var self = this;
    
    // Set the curved attribute
    this.curved = $el.attr("curved") == "t";
    
    var first_va = $el.find("va");
    var data_attr = first_va.attr("d");
    
    
    if (data_attr)
    {
        // Has only one va element, not nested.
        var points = data_attr.split(" ");
        // Loop through points, store in this.points.
        for (var i = 0; i < points.length; i++)
        {
            var coords = points[i].split(",");
            // Push (int)ed coordinates
            this.points.push([
                1 * coords[0],
                1 * coords[1]
            ]);
        }
    } 
    else 
    {
        // Check for nested va's
        var all_nested_vas = first_va.find("va");
        if (all_nested_vas.length)
        {
            all_nested_vas.each(function(){
                var points = $(this).attr("d").split(" ");
                for (var i = 0; i < points.length; i++)
                {
                    var coords = points[i].split(",");
                    // Push (int)ed coordinates
                    self.points.push([
                        1 * coords[0],
                        1 * coords[1]
                    ]);
                }
            });
        }
    }
}
Poly.prototype.draw = function(only_if_not_selected)
{
    if (only_if_not_selected && this.selected) return;
    
    // Call parent function
    if(!this.shouldDisplay()) return;
    
    // Start the line
    this.startStroke();
    
    // Get points in canvas coords
    this.cPoints = this.points2canvas();
    for (var i = 0; i < this.cPoints.length; i++) context.lineTo(this.cPoints[i][0], this.cPoints[i][1]);
    
    // End the line
    this.endStroke(function(){context.stroke();});
}

// Line object (drawable)
var Line = function(pattern_idx, item_idx, $el, pattern_center, pattern_rotation)
{
    PatternItem.call(this, pattern_idx, item_idx, $el, pattern_center, pattern_rotation);
}
Line.prototype = new Poly();
Line.prototype.setup = function($el)
{
    // Init points
    this.points = [];
    
    // Save alias to this
    var self = this;
    
    // Get vector array (should only contain two points)
    var va = $el.children("va").attr("d").split(" ");
    
    var pointA = va[0].split(",");
    var pointB = va[1].split(",");
    pointA[0] = pointA[0] * 1;
    pointA[1] = pointA[1] * 1;
    pointB[0] = pointB[0] * 1;
    pointB[1] = pointB[1] * 1;
    
    // Add vectors to this.points
    this.points.push(pointA);
    this.points.push(pointB);
}

// Textlabel object (drawable)
var Textlabel = function(pattern_idx, item_idx, $el, pattern_center, pattern_rotation)
{
    PatternItem.call(this, pattern_idx, item_idx, $el, pattern_center, pattern_rotation);
}
Textlabel.prototype = new Poly();
Textlabel.prototype.setup = function($el)
{
    var $children = $el.children();
    var $rotation_el = $children.filter('s[n="t"]');
    var $height_el = $children.filter('s[n="h"]');
    var $first_s = $children.filter('s');
    var $first_sa = $children.filter('sa');
    
    // Get the string
    this.string = $children.filter("st[d]").attr("d");
    
    // Get the center
    this.center = $children.filter("v[d]").attr("d").split(",");
    this.center[0] *= 1;
    this.center[1] *= 1;
    
    // get rotation and height
    if ($rotation_el.length) this.rotation = $rotation_el.attr("d") * 1;
    if ($height_el.length) this.height = $height_el.attr("d") * 1;
    
    // if not there, check sa
    if ($first_sa.length)
    {
        var da = $first_sa.attr("d").split(" ");
        this.height = da[0]*1;
        this.rotation = da[1] ? da[1]*1 : 0;
        
    }
    
    // Check just normal s for height
    if ($first_s.length) this.height = $first_s.attr("d") * 1;
    
    // Set default rotation
    this.rotation = this.rotation || 0;
    
    // Set appropriate font size
    this.fontSize = 5*this.height / 4;
    
    // Determine char width
    this.charWidth = this.height * 3 / 4;
    
    // Set width
    this.width = this.charWidth * this.string.length;
    
    // Set corners
    this.points.push(
        // top-left corner
        rotatePt([ -(this.width/2) , this.height ],this.rotation),
        // bottom-left corner
        rotatePt([ -(this.width/2) , 0 ],this.rotation),
        // bottom-right corner
        rotatePt([ (this.width/2) , 0 ],this.rotation),
        // top-right corner
        rotatePt([ (this.width/2) , this.height ],this.rotation),
        // top-left corner
        rotatePt([ -(this.width/2) , this.height ],this.rotation)
    );
    
    for (var i = 0; i < this.points.length; i++)
    {
        this.points[i][0] += this.center[0];
        this.points[i][1] += this.center[1];
    }
}
Textlabel.prototype.draw = function(only_if_not_selected)
{
    // Draw bounding box
    Poly.prototype.draw.call(this,only_if_not_selected);
    
    // Draw text
    var newC = c2s(addPoints(rotatePt(this.center,this.pattern_rotation),this.pattern_center));
    context.textBaseline = "alphabetic";
    context.textAlign = "center";
    context.font = "normal "+(this.fontSize*ratio)+"px monaco";
    context.fillStyle = this.selected ? cm_settings.plottypes[this.linetype]["active"] : cm_settings.plottypes[this.linetype]["inactive"] ; 
    
    if (this.rotation)
    {
        // save current context
        context.save();
        // translate context
        context.translate(newC[0],newC[1]);
        // rotate context
        context.rotate(-this.rotation-this.pattern_rotation);
        // draw text
        context.fillText(this.string,0,0);
        // restore
        context.restore();
    }
    else
    {
        context.fillText(this.string,newC[0],newC[1]);
    }
    
}

// Arc object (drawable)
var Arc = function(pattern_idx, item_idx, $el, pattern_center, pattern_rotation)
{
    PatternItem.call(this, pattern_idx, item_idx, $el, pattern_center, pattern_rotation);
}
Arc.prototype = new PatternItem();
Arc.prototype.setup = function($el)
{
    var children, data;
    $children = $el.children();
    
    // Get center point of circle/arc
    this.points.push( makePtNumeric($children.filter("v[d]").attr("d").split(",")) );
    

    
    // Get the radius, start, and sweep angle
    var data = $children.filter("sa").attr("d").split(" ");
    
    for (var i=0; i < data.length; i++) {
        data[i] = data[i] * 1;
    };
    this.radius = data[0];
    var startAngle = data[1];
    var endAngle = data[2];
    
    
    this.start = -startAngle;
    this.end = this.start - endAngle;
    this.antiClockwise = this.start > this.end;
    // this.start = 0;
    // this.end = 3;
    
    // Push 4 edges of complete circle
    this.points.push([ this.points[0][0] - this.radius , this.points[0][1] ]);
    this.points.push([ this.points[0][0] + this.radius , this.points[0][1] ]);
    this.points.push([ this.points[0][0] , this.points[0][1] - this.radius  ]);
    this.points.push([ this.points[0][0] , this.points[0][1] + this.radius ]);
}
Arc.prototype.draw = function(only_if_not_selected)
{
    if (only_if_not_selected && this.selected) return;
    
    // Call parent function
    if(!this.shouldDisplay()) return;
    
    // Start the stroke with correct styling, colors, etc
    this.startStroke();
    
    // Get the center in terms of the canvas
    this.cPoints = this.points2canvas();
    // console.log(this.cPoints[0]);
    // Draw actual arc
    // console.log("center: ",this.cPoints[0]);
    // console.log("radius: ",this.radius*ratio);
    // console.log("start: ",this.start);
    // console.log("end: ",this.end);
    context.arc(this.cPoints[0][0], this.cPoints[0][1], this.radius*ratio, this.start-this.pattern_rotation, this.end-this.pattern_rotation, this.antiClockwise);
    
    // End out the stroke
    this.endStroke(function(){context.stroke();});
    
}


// ----------------------------------
//  App Tools
// ----------------------------------

// Main tool prototype
var Tool = function()
{
    // Object of handlers for specific events
    this.handlers = {};
    
    // Array that holds keyCodes for pressed keys
    this.keysOn = [];
    
    // Set event handler
    this.on = function(evtObj)
    {
        // Set event type
        var evtType = evtObj.type;
        
        // Variable filled with response
        var evtResponse;
        
        // Check for tool-specific handler
        if (typeof this.handlers[evtType] == "function") 
        {
            // Call appropriate handler
            evtResponse = this.handlers[evtType](evtObj);
            
            // If evtResponse is strict not equal 
            // to true, return without going on.
            if ( evtResponse !== true ) return; 
        }
        
        // No tool-specific handler found,
        // pass event to global handlers
        if (typeof cm_handlers[evtType] == "function") 
        {
            cm_handlers[evtType](evtObj);
        }
    }
}
Tool.prototype.getName = function()
{
    return this.name;
}

// Move tool (translates current working window)
var HandTool = function()
{
    // Set this name
    this.name = "hand";
    
    // Set the private vars
    var mouse_is_down;
    var start_drag;
    var cur_drag;
    var start_origin;
    
    // ----------------------------------
    //  Main dragging action
    // ----------------------------------
    this.handlers["mousedown"] = function(evt)
    {
        // Set the mouse down state flag
        mouse_is_down = true;
        
        // Set the starting point
        start_drag = [ evt.offsetX, evt.offsetY ];
        
        // Set the starting origin
        start_origin = origin.slice();
        
        // Stop chrome from showing a text cursor
        evt.originalEvent.preventDefault();
    }
    this.handlers["mousemove"] = function(evt)
    {
        // if mouse is not down, pass
        // event onto global
        if (!mouse_is_down) return true;
        
        // Set the current drag point
        cur_drag = [ evt.offsetX, evt.offsetY ];
        
        // Calculate x and y distance traveled in cartesian (patternsmith)
        var x_dist = (cur_drag[0] - start_drag[0])/(zoomLvl*ratio);
        var y_dist = (cur_drag[1] - start_drag[1])/(zoomLvl*ratio);
        
        // Set the origin to the start_origin + new distances
        origin = [
            start_origin[0] + x_dist,
            start_origin[1] + y_dist
        ];
        
        return true;
    }
    this.handlers["mouseup"] = function(evt)
    {
        mouse_is_down = false;
    }
    
}
HandTool.prototype = new Tool();

// Zoom tool (zooms in and out)
var ZoomTool = function()
{
    // Set this name
    this.name = "zoom";
    
    // Set the private vars
    var down_point;
    var cur_point;
    var up_point;
    var mouse_is_down;
    var zoom_out = false;
    
    // mouse down
    this.handlers["mousedown"] = function(evt)
    {
        // Set the mouse down flag
        mouse_is_down = true;
        
        // Set the starting point
        down_point = [ evt.offsetX, evt.offsetY ];
        
        // Create new marque object
        cm_helpers["zoom-marquee"] = new Marquee(down_point,down_point);
        
        // stop text cursor in chrome
        evt.originalEvent.preventDefault();
    }
    
    // mouse move
    this.handlers["mousemove"] = function(evt)
    {
        // If mouse is not down, return true 
        // to allow other handlers to take event
        if (!mouse_is_down) return true;
        
        // Grab current point
        cur_point = [
            evt.offsetX,
            evt.offsetY
        ];
        
        // Set end corner of marquee
        cm_helpers["zoom-marquee"].setEndCorner(cur_point);
        
    }
    
    // mouse up
    this.handlers["mouseup"] = function(evt)
    {
        // Unset mouse down flag
        mouse_is_down = false;
        
        // Set marque local var
        var marq = cm_helpers["zoom-marquee"];
        
        // Check that this is an object
        if (typeof marq != "object") return;
        
        // Get corners of box
        var min = marq.getMinCorner();
        var max = marq.getMaxCorner();
        
        if (zoom_out)
        {
            var moveOutX = (cm_canvas.width() - (max[0] - min[0]))/1.3;
            min[0] -= moveOutX;
            max[0] += moveOutX;
            var moveOutY = (cm_canvas.height() - (max[1] - min[1]))/1.3;
            min[1] -= moveOutY;
            max[1] += moveOutY;
        }
        
        // Get area of box
        var area = marq.getArea();
        
        // Check if area is too small for box
        if (area < 26)
        {
            // Set change to make
            var zoom_amt = evt.custom_zoom_change || cm_settings.tools.zoom.zoom_amt;
            var ratio_change = (zoom_out) ? -1*zoom_amt : zoom_amt;
            var new_ratio = ratio + ratio_change;
            
            // Get (absolute) change in psxml units
            var d_psxml_units = Math.abs(cm_canvas.width() * (1/new_ratio - 1/ratio));
            
            // // Get ratio of mouse.x,mouse.y to full canvas size
            var cWidth = cm_canvas.width();
            var cHeight = cm_canvas.height();
            var x_m2c = evt.offsetX/cWidth;
            var y_m2c = evt.offsetY/cHeight;
            var centeredXMargin = ( cWidth -  cWidth * (1 - ratio_change) ) / 2;
            var centeredYMargin = ( cHeight - cHeight * (1 - ratio_change) ) / 2;
            
            // Set marquee to (1 - ratio_change) times the size of the canvas
            min = [
                centeredXMargin * 2 * x_m2c,
                centeredYMargin * 2 *y_m2c
            ];
            
            // Set max to appropriate 1-ratio_change size
            max = [
                min[0] + cWidth * (1 - ratio_change),
                min[1] + cHeight * (1 - ratio_change)
            ];
        }

        // Move the visible space so the top left corner of the marquee is at 0,0 (pixels)
        // The top left corner is min (in pixels)
        // markPoint(min);
        origin[0] -= min[0]/ratio;
        origin[1] -= min[1]/ratio;
        
        // Get the x & y ranges of visibility
        var xRange = (max[0] - min[0])/ratio;
        var yRange = (max[1] - min[1])/ratio;
        
        // Get prospective x&y pixels per unit ratios
        var xRatio = cm_canvas.width() / xRange;
        var yRatio = cm_canvas.height() / yRange;
        
        // Set the master ratio
        ratio = Math.min(xRatio, yRatio);
        
        if (ratio == xRatio)
        {
            // y must be centered
            //              ((height of canvas   - y-range in pixels) / 2) / ratio
            var offsetY = (( cm_canvas.height() - (yRange * ratio) ) / 2) / ratio;
            origin[1] += offsetY;
        }
        else
        {
            // x must be centered
            
            var offsetX = (( cm_canvas.width() - (xRange * ratio) ) / 2) / ratio;
            origin[0] += offsetX;
        }
        
        // which plane was used?
        var mapping_plane = (ratio == xRatio) ? "x" : "y";
        
        // Unset zoom marquee
        delete cm_helpers["zoom-marquee"];
    }
    
    // key down
    this.handlers["keydown"] = function(evt)
    {
        switch(evt.keyCode)
        {
            // Shift
            case 16:
                zoom_out = true;
                cm_canvas.addClass("out");
                break;
            
            default:
                return true;
        }
    }
    
    // key up
    this.handlers["keyup"] = function(evt)
    {
        switch(evt.keyCode)
        {
            // Shift
            case 16:
                zoom_out = false;
                cm_canvas.removeClass("out");
                break;
            
            default:
                return true;
        }
    }
    
    // mousewheel
    this.handlers["mousewheel"] = function(evt)
    {
        var dy = evt.originalEvent.wheelDeltaY;
        var mousedown_evt = {
            offsetX: cm_mouse[0],
            offsetY: cm_mouse[1],
            originalEvent: {preventDefault:function(){return;}}
        };
        var mouseup_evt = {
            offsetX: cm_mouse[0],
            offsetY: cm_mouse[1],
            custom_zoom_change:cm_settings.tools.zoom.mousewheel_amt * 0.16 + 0.01
        };
        if (dy > 0) 
        {
            // simulate zooming in
            currentTool.handlers["mousedown"](mousedown_evt);
            currentTool.handlers["mouseup"](mouseup_evt);
        }
        else
        {
            
            // zooming out
            zoom_out = true;
            currentTool.handlers["mousedown"](mousedown_evt);
            currentTool.handlers["mouseup"](mouseup_evt);
            zoom_out = false;
        }
    }
}
ZoomTool.prototype = new Tool();

// Cursor/Default tool
var CursorTool = function()
{
    // Set this name
    this.name = "cursor";
    
    // Set the private vars
    var shift_is_down;
    
    // mousedown
    this.handlers["mousedown"] = function(evt)
    {
        // Stop weird drag cursor issue in chrome
        evt.originalEvent.preventDefault();
        
        
        
        // Set current mouse pos in a local var
        var mouse = [evt.offsetX, evt.offsetY];
        
        cm_helpers["cursor-marquee"] = new Marquee(mouse,mouse);
    },
    
    // mousemove
    this.handlers["mousemove"] = function(evt)
    {
        if ( cm_helpers["cursor-marquee"] instanceof Marquee ) {
            var mouse = [evt.offsetX, evt.offsetY];
            cm_helpers["cursor-marquee"].setEndCorner(mouse);
        }
        
    }
    
    // mouseup
    this.handlers["mouseup"] = function(evt)
    {
        // Is the marquee there?
        if (!cm_helpers["cursor-marquee"]) return;
        
        // If shift is not down, deselect
        if (!shift_is_down) cm_canvas.trigger("cm.deselect");
        
        // Set variable to hold timeout time to catch an update
        var time_to_update = 1000/cm_settings.general.max_frame_rate;
        
        // Set marquee to hidden
        cm_helpers["cursor-marquee"].hide = true;
        
        // Get area of marquee
        var marquee_area = cm_helpers["cursor-marquee"].getArea();
        
        // Check if area is big enough
        if (marquee_area <= cm_settings.tools.cursor.min_marquee_area)
        {
            // Make a little bigger
            var center = cm_helpers["cursor-marquee"].getMinCorner();
            cm_helpers["cursor-marquee"]
                .setStartCorner([center[0] - cm_settings.tools.cursor.click_radius, center[1] - cm_settings.tools.cursor.click_radius])
                .setEndCorner([center[0] + cm_settings.tools.cursor.click_radius, center[1] + cm_settings.tools.cursor.click_radius]);
        }
        
        // Set cursor_point variable to true if there is anything in the marquee
        if (cm_helpers["cursor-marquee"].hasEmptyPixels())
        {
            // Deselect all
            if (!shift_is_down) cm_canvas.trigger("cm.deselect");
            delete cm_helpers["cursor-marquee"];
        }
        else
        {
            // Look for new select
            cm_cursor_point = true;
        }



        // Update canvas after next refresh
        cm_canvas.trigger("cm.change");
        cm_cursor_point = false;
        delete cm_helpers["cursor-marquee"];
    }
    
    // keydown
    this.handlers["keydown"] = function(evt)
    {
        switch(evt.keyCode)
        {
            // shift key
            case 16:
                shift_is_down = true;
                return true;
                
            default:
                return true;
        }
    }
    
    // keyup
    this.handlers["keyup"] = function(evt)
    {
        switch(evt.keyCode)
        {
            // shift key
            case 16:
                shift_is_down = false;
                return true;
                
            default:
                return true;
        }
    }
    
}
CursorTool.prototype = new Tool();

var MarkTool = function(){
    
    var self = this;
    
    // Set name of tool
    this.name = "mark";
    
    
    // Handlers
    this.handlers["mousedown"] = function(evt)
    {
        var poly1, poly2, pts1, pts2, shares_a_point = false, pattern, dialog_html;
        
        try {
            // Check that two things are selected
            if (cm_selected_length !== 2) throw "Select exactly two polylines.";
            
            // Check that they are polylines or lines
            for (var k in cm_selected)
            {
                if (! (cm_selected[k] instanceof Poly) ) throw "One of the objects selected is not a polyline.";
                if (!poly1)
                {
                    poly1 = cm_selected[k];
                    pts1 = poly1.points.slice();
                }
                else 
                {
                    poly2 = cm_selected[k];
                    pts2 = poly2.points.slice();
                }
            }
            
            // Check that they are in the same pattern
            if (poly1.pattern_index !== poly2.pattern_index) throw "The polylines you have selected are not in the same pattern";
            
            // Check for same start points
            if ( isSamePoint(pts1[0], pts2[0]) ) 
            {
                throw "The point shared by these two polylines are both starting points. It must be the starting point for one and the ending point for the other. Reverse the direction of one of these polylines and try again.";
            }
            
            // Check for same end points
            if ( isSamePoint(pts1[pts1.length -1], pts2[pts2.length -1]) )
            {
                throw "The point shared by these two polylines are both end points. It must be the starting point for one and the ending point for the other. Reverse the direction of one of these polylines and try again.";
            }
            
            if ( isSamePoint(pts1[0], pts2[pts2.length -1]) )
            {
                shares_a_point = true;
                pts2.reverse();
                // poly2 is the entry segment
            }
            if ( isSamePoint(pts1[pts1.length -1], pts2[0]) )
            {
                if (shares_a_point) throw "These polylines share more than one end point.";
                shares_a_point = true;
                pts1.reverse();
                // poly1 is the entry segment
            }
            if (!shares_a_point) throw "These polylines do not share an end point.";
            
            
            // Get the pattern
            pattern = project.patterns[poly1.pattern_index];
            
            // Check pattern for rotation
            // if (pattern.rotation != 0)
            // {
            //     for (var i = pts1.length - 1; i >= 0; i--){
            //         pts1[i] = rotatePt(pts1[i],pattern.rotation);
            //     };
            //     for (var i = pts2.length - 1; i >= 0; i--){
            //         pts2[i] = rotatePt(pts2[i],pattern.rotation);
            //     };
            // }
            
            // Get dialog
            dialog_html = ich.mark_dialog({
                pattern_name:pattern.name.substr(0,3),
                distance_from_edge:cm_settings.tools.mark.default_edge_distance,
                text_height:cm_settings.tools.mark.default_label_height
            });
            
            var $dialog = $(dialog_html).dialog({
                minWidth:320,
                resizable:false,
                modal:true,
                buttons:{
                    Ok:function()
                    {
                        // Create object containing corner mark info
                        var 
                            markObj = {}, 
                            GD,
                            theta, 
                            mu, 
                            GY, 
                            XY, 
                            ZC, 
                            lineZC, 
                            vector,
                            center_of_text,
                            bisector_cos,
                            $newText,
                            newTextObj,
                            arcRadius,
                            arcStart,
                            arcEnd,
                            $arc,
                            arcObj,
                        
                        // Set input values
                        entry_mark = $("#entry_mark").val(),
                        corner_mark = $("#corner_mark").val(),
                        exit_mark = $("#exit_mark").val(),
                        draw_semi = $("#draw_semi").is(":checked"),
                        distance_from_edge = $("#distance_from_edge").val() *1,
                        text_height = $("#text_height").val() *1,
                        text_rotation,
                        rename_pattern = $("#rename_pattern").is(":checked");

                            
                        try
                        {
                            // ------------------------------------
                            //  Validation:
                            // ------------------------------------
                            
                            // Check length of chars
                            if (
                                entry_mark.length > cm_settings.tools.mark.max_mark_chars ||
                                corner_mark.length > cm_settings.tools.mark.max_mark_chars ||
                                exit_mark.length > cm_settings.tools.mark.max_mark_chars
                            ) 
                                throw "Marks can contain "+cm_settings.tools.mark.max_mark_chars+" characters maximum";

                            // Check distance from edge and text height
                            if (distance_from_edge < cm_settings.tools.mark.min_edge_distance) throw "Distance from edge must be greater than "+cm_settings.tools.mark.min_edge_distance+".";
                            if (distance_from_edge > cm_settings.tools.mark.max_edge_distance) throw "Distance from edge must be less than "+cm_settings.tools.mark.max_edge_distance+".";

                            // Check if text height ok
                            if (text_height < cm_settings.tools.mark.min_label_height) throw "Label height must be greater than "+cm_settings.tools.mark.min_label_height+".";
                            if (text_height > cm_settings.tools.mark.max_label_height) throw "Label height must be less than "+cm_settings.tools.mark.max_label_height+".";

                            // If renaming the pattern, check that something is actually there
                            if (corner_mark.length <= 0) throw "There must always be a value for the Corner Mark label.";



                            // ------------------------------------
                            //  All validation has passed
                            // ------------------------------------
                            // @see diagram ./mark_diagram.png
                            // Get GD, width of the corner text box
                            GD = (text_height * 3 / 4) * corner_mark.length;
                            // calculate Ø, angle of AZB
                            theta = getRadiansBetweenPts(pts1[1],pts2[1],pts1[0]);
                            // console.log("angle between sides: "+(theta/Math.PI)*180);
                            // get µ, angle of triangle GYV (or DXW)
                            mu = (Math.PI - theta)/2;
                            // console.log("angle at one corner: "+(180*mu/Math.PI));
                            // Get length of GY (or DX)
                            GY = distance_from_edge/Math.sin(mu);
                            // Get the length of XY
                            XY = GD + 2*GY;
                            // Get length of ZC
                            ZC = (XY/2) * Math.tan(mu);
                            // Get the equation for line ZC
                            lineZCobj = getAngleBisector(pts1[1],pts2[1],pts1[0],true);
                            lineZC = lineZCobj.line;
                            // console.log(lineZCobj);
                            // for (i = pts1[0][0] - 10; i < (pts1[0][0] + 10); i++) markPoint( addPoints ( [i,lineZC(i)],pattern.center), true);
                            
                            // Get the cosine for the angle bisector
                            bisector_cos = Math.cos(lineZCobj.phi);
                            vector = [ pts1[0][0] + ZC * (bisector_cos/Math.abs(bisector_cos)) ];
                            vector.push(lineZC(vector[0]));
                            
                            // Get center of new text object
                            center_of_text = addPoints( pts1[0], multiplyPoint( normalizeVector( subtractPoint(vector,pts1[0]) ), ZC ) );
                            // markPoint(addPoints(pattern.center,center_of_text),true);
                            text_rotation = lineZCobj.phi - Math.PI/2;
                            
                            // Mark the new center
                            // markPoint( addPoints(center_of_text,pattern.center),true);
                            
                            // Add center text element
                            $newText = $('<text><e/><st d="'+corner_mark+'"/><v d="'+center_of_text[0]+','+center_of_text[1]+'"/><sa d="'+text_height+' '+text_rotation+'"/></text>');
                            pattern.$el.append($newText);
                            newTextObj = pattern.addTextlabel($newText);
                            // Add semi-circle (arc) around this element
                            arcRadius = distanceBetween(pts1[0],newTextObj.points[3]) + distance_from_edge/2;
                            if (lineZCobj.correction)
                            {
                                arcStart = lineZCobj.theta_A - Math.PI*2; // -this.start
                                arcStop = lineZCobj.theta_C - arcStart;  // -this.end
                            }
                            else
                            {
                                arcStart = lineZCobj.theta_A; // -this.start
                                arcStop = lineZCobj.theta_C - lineZCobj.theta_A;  // -this.end
                            }

                            // this.start = -startAngle;
                            // this.end = this.start - endAngle;
                            // this.antiClockwise = -startAngle > (-startAngle - endAngle);
                            
                            
                            $arc = $('<arc><e/><v d="'+pts1[0][0]+','+pts1[0][1]+'"/><sa d="'+arcRadius+' '+arcStart+' '+arcStop+'"/></arc>');
                            pattern.$el.append($arc);
                            newArcObj = pattern.addArc($arc);
                            // console.log($arc[0]);
                            
                            // entry_mark
                            if (entry_mark.length || exit_mark.length)
                            {
                                // Init vars
                                var ZS;
                                
                                // Get ZS (ZE + seam allowance)
                                if (entry_mark.length)
                                {
                                    
                                }

                                // exit_mark
                                if (exit_mark.length)
                                {

                                }
                            }
                            cm_canvas.trigger("cm.change");
                            $(this).dialog("close");
                            
                        }
                        catch (e)
                        {
                            $.pnotify({
                                text:e,
                                type:"error"
                            });
                            console.log(e.stack);
                            return;
                        }
                        
                    },
                    Cancel:function()
                    {
                        $(this).dialog("close");
                    }
                },
                open:function(evt,ui)
                {
                    cm_handlers.setToolToKey("cursor");
                    cm_canvas.trigger("disable");
                    // $(this).find("#entry_mark").focus();
                    setTimeout(function(){ $('form #entry_mark').last().focus();},0);
                },
                close:function(evt,ui)
                {
                    $(this).dialog("destroy").remove();
                    cm_canvas.trigger("enable");
                }
            });
            
            // Set show/hide behavior for additional options
            $("a.show-add-ops",$dialog).on("click",function()
            {
                var $this = $(this);
                var text = $this.text();
                var newTxt = text == "show" ? "hide" : "show";
                var $ops = $this.parent().next("div.additional-options");
                $ops.toggle();
                $this.text(newTxt);
            });
            
            
        } catch (e) {
            $.pnotify(e);
            return true;
        }
        
    }
    
}
MarkTool.prototype = new Tool();




// ----------------------------------
//  App Helpers
// ----------------------------------

// Dotted/Solid box for zoom drag, select drag, etc.
var Marquee = function(xy0,xy1)
{
    this.psCoords = {};
    this.setStartCorner(xy0).setEndCorner(xy1);
    this.da = [7,2];
    this.stroke = "#FFF";
    this.hide = false;
}
Marquee.prototype.draw = function()
{
    if (this.hide) return;
    context.lineWidth = 0.5;
    context.strokeStyle = this.stroke;
    // dashed line
    // context.dashedLine(this.x0, this.y0, this.x0, this.y1, this.da);
    // context.dashedLine(this.x0, this.y1, this.x1, this.y1, this.da);
    // context.dashedLine(this.x1, this.y0, this.x1, this.y1, this.da);
    // context.dashedLine(this.x0, this.y0, this.x1, this.y0, this.da);
    
    // normal line
    context.beginPath();
    context.lineTo(this.x0, this.y0);
    context.lineTo(this.x0, this.y1);
    context.lineTo(this.x1, this.y1);
    context.lineTo(this.x1, this.y0);
    context.lineTo(this.x0, this.y0);
    
    // Make stroke
    context.stroke();
}
Marquee.prototype.setStartCorner = function(xy)
{
    // Set start point
    this.x0 = xy[0];
    this.y0 = xy[1];
    
    // Set psCoords start point
    var converted = s2c([this.x0,this.y0]);
    this.psCoords.x0 = converted[0];
    this.psCoords.y0 = converted[1];
    
    return this; // to allow chaining
}
Marquee.prototype.setEndCorner = function(xy)
{
    // Set end point
    this.x1 = xy[0];
    this.y1 = xy[1];
    
    // Update psxml coordinates of this box
    var converted = s2c([this.x1,this.y1]);
    this.psCoords.x1 = converted[0];
    this.psCoords.y1 = converted[1];
    
    return this; // to allow chaining
}
Marquee.prototype.getMinCorner = function(use_psxml_plane)
{
    // var func = use_s2c ? s2c : function(point){return point;} ;
    // return func([ Math.min(this.x0,this.x1), Math.min(this.y0, this.y1) ]);
    var obj = use_psxml_plane ? this.psCoords : this ;
    return [ Math.min(obj.x0,obj.x1), Math.min(obj.y0, obj.y1) ];
}
Marquee.prototype.getMaxCorner = function(use_psxml_plane)
{
    var obj = use_psxml_plane ? this.psCoords : this ;
    return [ Math.max(obj.x0,obj.x1), Math.max(obj.y0, obj.y1) ];
}
Marquee.prototype.getArea = function()
{
    var width = Math.abs(this.x0 - this.x1);
    var height = Math.abs(this.y0 - this.y1);
    return width * height;
}
Marquee.prototype.getCenter = function()
{
    return [ (this.x0 + this.x1)/2 , (this.y0 + this.y1)/2 ];
}
Marquee.prototype.getImgData = function()
{
    // Gets hash of pixel data (to check for differences)
    var min = this.getMinCorner();
    var max = this.getMaxCorner();

    // Get the image data (within the marquee)
    try {
        return context.getImageData(
            min[0],
            min[1],
            max[0] - min[0], 
            max[1] - min[1]
        );
    } 
    catch(e)
    {
        return context.getImageData(
            min[0],
            min[1],
            1,
            1
        );
    }
}
Marquee.prototype.hasEmptyPixels = function()
{
    var imgData = this.getImgData();
    var length = imgData.data.length;
    for(var i = 0; i < length; ++i){
        if (imgData.data[i] > 0) 
        {
            // console.log("done! (not empty)");
            return false;
        }
    }
    // console.log("done! (empty)");
    return true;
}
Marquee.prototype.overlapsWith = function(box_min, box_max)
{
    // NOTE: All coords are in psxml coordinates
    var overlap = doBoxesOverlap(
        box_min, 
        box_max, 
        [this.psCoords.x0, this.psCoords.y0], 
        [this.psCoords.x1, this.psCoords.y1]
    );
    
    return overlap;
}
Marquee.prototype.containsBox = function(cornerA, cornerB, canvas_coords)
{
    var min = this.getMinCorner(true);
    var max = this.getMaxCorner(true);
    // console.log(min, max, cornerA, cornerB);
    
    var retVal =
        // left-most x should be greater than min[0]
        Math.min(cornerA[0],cornerB[0]) > min[0]
        &&
        // right-most x should be less than max[0]
        Math.max(cornerA[0],cornerB[0]) < max[0]
        &&
        // bottom y should be more than min[1]
        Math.min(cornerA[1],cornerB[1]) > min[1]
        &&
        // top y should be less than max[1]
        Math.max(cornerA[1],cornerB[1]) < max[1]
    ;
    // console.log(retVal);
    return retVal;
}

// UI of whole app
// Sets up menu items, buttons, etc.
var CmGui = function()
{
    var self = this;
    this.initDisabler();
    this.initMenuBar();
    this.initSideTools();
}
CmGui.prototype = {
    
    initDisabler:function()
    {
        window.cm_disabler = $("#canvas-disabler")
            .width(cm_canvas.width() + 4)
            .height(cm_canvas.height() + 4)
            .css("marginBottom",-cm_canvas.height() - 4);
        
        cm_canvas.on("disable",function(){
            cm_disabler.show();
            cm_canvas.disabled = true;
        });
        cm_canvas.on("enable",function(){
            cm_disabler.hide();
            cm_canvas.disabled = false;
        })
    },
    
    // Inits top menu bar
    initMenuBar:function()
    {
        var self = this;
        
        // Make all dropdowns jQuery ui menus
        $(".cm-menu-item ul.cm-menu-dropdown").menu();
        
        // Loop through menu items
        $(".cm-menu-item").each(function(i,el)
        {
            var $this, $heading, $ul, mouseDownAt, mouseUpAt, wasVisible, menuName;
            
            // Cache this element
            $this = $(this)
            
            // Get menu name
            menuName = $this.data("menu");
            
            // Get menu heading and prevent a from following hash
            $heading = $this.find(".cm-menu-item-header").on("click",function(evt){evt.preventDefault();})
            
            // Cache ul
            $ul = $this.find("ul.cm-menu-dropdown");
            
            // Check for dropdown
            if ($ul.length) 
            {
                // Set heading behavior
                $heading
                    // mousedown
                    .on("mousedown",function(evt){
                    
                        evt.originalEvent.preventDefault();
                    
                        wasVisible = true;
                    
                        if (!$ul.is(":visible"))
                        {
                            wasVisible = false;
                            $ul.show();
                            $heading.addClass('active');
                        }
                    
                        mouseDownAt = +new Date();
                        
                        // Set mouseup on anything other than this menu as off
                        var clearMenu = function(){
                            $ul.hide();
                            $heading.removeClass("active");
                            cm_canvas.off("mouseup mousedown",clearMenu);
                        }
                        cm_canvas.on("mouseup mousedown",clearMenu);
                        
                    })
                    .on("")
                    // mouseup
                    .on("mouseup",function(evt){
                    
                        mouseUpAt = +new Date();
                    
                        var downTime = mouseUpAt - mouseDownAt;
                    
                        if (downTime < 400)
                        {
                            if (wasVisible)
                            {
                                $ul.hide();
                                $heading.removeClass('active');
                            }
                            else
                            {
                                $ul.show();
                                $heading.addClass('active');
                            }
                        }
                        else
                        {
                            $ul.hide();
                            $heading.removeClass('active');
                        }
                        
                        evt.stopPropagation();
                    
                    })
                ;
                // Set menu subitem behavior
                $ul.find("li a").on("mouseup",function(evt)
                {
                    $(this).trigger("select");
                    $ul.hide();
                    $heading.removeClass('active');
                    evt.stopPropagation();
                });
            }
            
            // Check for menu-specific init
            if (typeof self.menuItemInits[menuName] === "function")
            {
                self.menuItemInits[menuName]($this,$heading,$ul);
            }
        });
    },
    
    menuItemInits:{
        file:function($item, $heading, $dropdown)
        {
            
        },
        settings:function($item, $heading, $dropdown)
        {
            // TODO: Initialize the form to change settings
            var $settingFrm = $("#cm-settings-frm");
            var $settingSections = $("#cm-setting-sections");
            
            // Set dialog widget
            $settingFrm.dialog({
                autoOpen: false,
                buttons:{
                    Ok: function(){
                        $(this).dialog("close");
                    }
                },
                resizeStart:function(){
                    cm_canvas.trigger("disable");
                },
                resizeStop:function(){
                    cm_canvas.trigger("enable");
                },
                dragStart:function(){
                    cm_canvas.trigger("disable");
                },
                dragStop:function(){
                    cm_canvas.trigger("enable");
                },
                close:function(){
                    cm_canvas.trigger("enable");
                }
            });
            
            // Set accordion widget
            $settingSections.tabs();
            
            $heading.on("click",function(){
                
                $settingFrm.dialog("open");
                
            });
        }
    },
    
    // Initialize left side toolbar
    initSideTools:function()
    {
        // Set the behavior for buttons
        $(".cm-tool").on("click",function(){
            var $this = $(this);
            // Set the tool
            setCurrentTool( $this.data("tool") );
        });
    }
}



// ----------------------------------
//  App Object
// ----------------------------------
CornerMarker = new function()
{
    // Var to hold wait flag for redraw() function
    var wait = false;
    
    // Initializes all patterns and their items
    function initProject(xml)
    {
        window.origXML = xml;
        // jQuery-ify the xml
        window.$xml = $(window.origXML);
        // Find every pattern
        var $patterns = $xml.find("pattern");
        // Create Pattern instances for each
        $patterns.each(function(i){
            project.patterns.push( new Pattern(i, $(this)) );
        });
        
        // -----------------------------------------------------
        //  Calculate visible range of pattern coordinate plane.
        // -----------------------------------------------------
        
        // get all min/max points in project
        var allMinMaxPoints = [], min = [], max = [];
        
        // Loop through patterns...
        for (j in project.patterns)
        {
            // Set current pattern local var
            var cur_pattern = project.patterns[j];
            // Get center
            var pattern_center = cur_pattern.center;
            // Loop through items...
            for (k in cur_pattern.items)
            {
                // Set current item to local var
                var cur_item = cur_pattern.items[k];
                // Push min and max
                allMinMaxPoints.push( cur_item.min, cur_item.max);
            }
        }
        
        // Go through all points, set max and min values
        var pointsLen = allMinMaxPoints.length;
        for (var k = 0; k < pointsLen; k++)
        {
            var coords = allMinMaxPoints[k];
            // check min x
            if (min[0] == undefined || coords[0] < min[0]) min[0] = coords[0];
            // check max x
            if (max[0] == undefined || coords[0] > max[0]) max[0] = coords[0];
            // check min y
            if (min[1] == undefined || coords[1] < min[1]) min[1] = coords[1];
            // check max y
            if (max[1] == undefined || coords[1] > max[1]) max[1] = coords[1];
        }
        
        // Get the x & y ranges of visibility
        var xRange = max[0] - min[0];
        var yRange = max[1] - min[1];
        
        // Get prospective x&y pixels per unit ratios
        var xRatio = cm_canvas.width() / xRange;
        var yRatio = cm_canvas.height() / yRange;
        
        // Set the master ratio
        ratio = Math.min(xRatio, yRatio);
        
        // which plane was used?
        var mapping_plane = (ratio == xRatio) ? "x" : "y";
        
        // Determine the psxml coordinates of the top left corner of the canvas (0,0)
        
        // if x was used, the visible area should be
        // vertically-centerd, so the min[0] is correct.
        // min[1] - half of the extra space on the y-plane would be used.
        // if y was used, the visible area should be
        // horizontally centered
        
        // Coords for top left corner of canvas (in ps units)
        var x_coord, y_coord;
        
        if (mapping_plane == "x") 
        {
            // calculate y offset
            var offset_y = ((cm_canvas.height() - yRange * ratio)/2)/ratio;
            y_coord = max[1] + offset_y;
            
            // x is at 0
            x_coord = min[0];
        }
        else
        {
            // y is at 0
            y_coord = max[1]
            
            // calculate x offset
            var offset_x = ((cm_canvas.width() - xRange * ratio)/2)/ratio;
            x_coord = min[0] - offset_x;
        }
        
        // Extract origin from these coordinates
        origin = [
            0 - x_coord,
            0 + y_coord
        ];
        
        redraw();
        
    }
    
    // Initializes tools
    function initTools()
    {
        // Set the tools
        cm_tools["cursor"] = new CursorTool();
        cm_tools["zoom"] = new ZoomTool();
        cm_tools["hand"] = new HandTool();
        cm_tools["mark"] = new MarkTool();
        
        // Set the initial tool (cursor)
        setCurrentTool("cursor");
        
        // Capture certain window events
        $win.on("keydown keyup mousewheel scroll onscroll",function(evt){
            if (!cm_canvas.disabled)
            {
                // Send event to current tool
                currentTool.on(evt);
                // Trigger change event on canvas
                cm_canvas.trigger("cm.change");
            }
        });
        
        // Capture certain canvas events
        cm_canvas.on("mousedown mousemove mouseup mouseover cm.deselect",function(evt){
            // Send event to current tool
            currentTool.on(evt);
            // Trigger change event on canvas
            cm_canvas.trigger("cm.change");
            evt.stopPropagation();
        });
    }
    
    // The main loop controller for the app
    function redraw()
    {
        if (wait) return;
        wait = true;
        
        // requestAnimFrame(function(){wait = false});
        // Clear screen
        context.clearRect(0, 0, cm_canvas.width(), cm_canvas.height() );
        
        // Draw each pattern
        for (k in project.patterns)
        {
            project.patterns[k].draw();
        }
        
        // Draw selected
        for (k in cm_selected)
        {
            
            cm_selected[k].draw();
        }
        
        // Draw helper items
        // TODO: perhaps make search through cm_helpers recursive
        for (l in cm_helpers)
        {
            var helper = cm_helpers[l];
            if (typeof helper == "object") {
                
                if (typeof helper.draw == "function") helper.draw();
                else 
                {
                    // Look one level more for objects with draw() method
                    for (k in helper)
                    {
                        var helper2 = helper[k];
                        if (typeof helper2 == "object" && typeof helper2.draw == "function") helper2.draw();
                    }
                }
            }
        }
        // setTimeout(function(){wait = false},1000/cm_settings.general.max_frame_rate);
        wait = false;
        // cm_cursor_point = false;
    }
    
    
    
    // ----------------------------------
    //  Main initialization method
    // ----------------------------------
    this.run = function()
    {
        // Set jqueryui as pnotify style
        $.pnotify.defaults.styling = "jqueryui";
        
        // Set window jQuery object
        $win = $(window);
        
        // Set cm_canvas
        cm_canvas = $('<canvas id="editor" width="'+($win.width() - (cm_settings.canvas.padding[0] * 2))+'" height="'+($win.height() - (cm_settings.canvas.padding[1] * 2))+'" data-tool="cursor"></canvas>')
        .appendTo("body");
        
        // Set the context
        context = cm_canvas[0].getContext("2d");
        
        // Set project
        xml = $.parseXML($("#project-data").html());
        
        // Initialize project
        initProject( xml );
        
        // Initialize tools
        initTools();
        
        // Initialize GUI
        var gui = new CmGui();
        
        // Set up redraw listener.
        cm_canvas.on("cm.change",function(){
            redraw();
        });
        
        // Set up mouseleave listener
        cm_canvas.on("mouseleave",function(){
            cm_canvas.trigger("mouseup");
        })
    }
}




// ----------------------------------
//  Start it up!
// ----------------------------------
window.onload = function()
{
    CornerMarker.run();
}




// ----------------------------------
//  Hold on!
// ----------------------------------
// window.onbeforeunload = function(evt){
//     var retVal = "Stop! Are you sure you want to leave? Any changes you have made will be lost.";
//     evt.returnValue = retVal;
//     return retVal;
// };