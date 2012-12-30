var Walker = function(settings)
{
	this._Width = settings.Width || 600;
	this._Height = settings.Height || 600;
	this._ViewAngle = settings.ViewAngle || 45;
	this._Near = settings.Near || 0.1;
	this._Far = settings.Far || 10000;
	this._ShowAxis = settings.ShowAxis || false;
	this._AllowControls = settings._AllowControls || false;	
	this._Aspect = this._Width / this._Height;
	this._ContainerID = settings.ContainerID;
	this._ObjPath = settings.ObjPath;	
	this._ListObjectsID = settings.ListObjectsID || null;
	this._Speed = 222;
	this._Rendered = false;
	this._Container = null;
	this._Axis = null;
	this._3DObjects = {};
	this.Renderer = null;
	this.Camera = null;
	this.Scene = null;
	this.House = null;
	this.Loader = null;
	this.Controls = null;
	this.House = null;
	this.Clock = null;
	delete settings;
};

var walProto = Walker.prototype;

walProto.init = function()
{
	this._Container = this._ContainerID ? 
		document.getElementById(this._ContainerID) :
		null;

	if (!this._Container) return;

	this._create3DContext();
	this.animate();
};

walProto._create3DContext = function()
{
	this.Renderer = new THREE.WebGLRenderer();
	this.Renderer.setSize(this._Width, this._Height);
	this._Container.appendChild(this.Renderer.domElement);

	this.Camera = new THREE.PerspectiveCamera(
		this._ViewAngle, 
		this._Aspect, 
		this._Near, 
		this._Far);
	this.Camera.position.z = 300;

	this.Scene = new THREE.Scene();
	this.Scene.add(this.Camera);

	//!debugStart
	var ambient = new THREE.AmbientLight(0x101030);
	this.Scene.add(ambient);
	var directionalLight = new THREE.DirectionalLight(0xffeedd);
	directionalLight.position.set( 20, 10, 12 ).normalize();
	this.Scene.add(directionalLight);
	//!debugEnd

	if (this._ShowAxis)
		this.showAxis()
	if (this._IsAllowControls)
	{
		this.Controls = new THREE.TrackballControls(this.Camera);

		this.Controls.rotateSpeed = 1.0;
		this.Controls.zoomSpeed = 1.2;
		this.Controls.panSpeed = 0.8;

		this.Controls.noZoom = false;
		this.Controls.noPan = false;

		this.Controls.staticMoving = true;
		this.Controls.dynamicDampingFactor = 0.3;

		this.Controls.keys = [ 65, 83, 68 ];
	}

	this.Loader = new THREE.OBJLoader();
	this.addEvent( this.Loader, 'load', this._onLoadOBJFile )
	this.Loader.load(this._ObjPath);

	this.Clock = new THREE.Clock();
	this.Renderer.render( this.Scene, this.Camera );
};

walProto._onLoadOBJFile = function (args) 
{
		this.House = args.Event.content;

		this.Scene.add(this.House);
		this._Rendered = true;
		this._fillListObjects();
		this.render();
};

walProto.showAxis = function () 
{
	this._Axis = new THREE.AxisHelper(100);
	this.Scene.add( this._Axis );
}

walProto.animate = function (delta) 
{

	requestAnimationFrame( this.animate.bind(this) );
	this.flyAround(delta);
	this.render();
};

walProto.flyAround = function (delta) 
{
	this.Camera.position.set( Math.sin(delta/1000)*300, 100, Math.cos(delta/1000)*300 );
};

walProto.render = function () 
{

	// var timer = Date.now() * this._Speed;

	// this.Camera.position.x = Math.cos( timer ) * 200;
	// this.Camera.position.z = Math.sin( timer ) * 200;
	// this.Camera.lookAt( this.Scene.position );
	this.Camera.lookAt( this.Scene.position );
	if (this._IsAllowControls) 
		this.Controls.update();

	// this.FirstPControls.update(0.01);
	this.Renderer.render( this.Scene, this.Camera );

};

walProto.addEvent = function(elem, eventType, callback, args) {
    var self = this,
    	args = args || {},
	    func = function(event)
	    {
	    	args.Event = event;
	    	callback.call(self, args)
	    };

    if(document.addEventListener) 
    	elem.addEventListener(eventType, func, false);
    else 
        elem.attachEvent('on' + eventType, func);
    
};

walProto._fillListObjects = function()
{
	if (!this._ListObjectsID) 
		return;

	var listObjectsDOM = document.getElementById(this._ListObjectsID);
	if (!listObjectsDOM) 
		return;	

	var children = this.House.children, 
		name, child, option;

	for (var i = 0; i < children.length; i++)
	{
		child = children[i];
		name = child.geometry.name; 

		if (!name) 
			continue;

		this._3DObjects[child.id] = child;

		option = document.createElement("option");
		option.value = child.id;
		option.text = name;
		listObjectsDOM.add(option)
	};
};

walProto.moveObject = function(id, x, y, z)
{
	var obj = this._3DObjects[id];
	if (!obj)
		return;

	obj.position.set(x, y, z);
};

walProto.getPosition = function(id)
{
	var obj = this._3DObjects[id];
	if (!obj)
		return;

	return obj.position;
};

walProto.testMoves = function()
{
	var object, children = this.House.children, child, timerID;
	var rName = /door/g,i;

	for (var i = 0; i < children.length; i++)
	{
		child = children[i];
		window.timeouts = window.timeouts || [];

		timerID = setTimeout(
			function(child)
			{
				window.intervals = window.intervals || [];
				child.intevalID = setInterval(function(child){ animateObject(child) }, 100, child);
				window.intervals.push(child.intevalID);
			},
			
			i*1000,

			child
		);

		window.timeouts.push(timerID);

	};

	function animateObject(object)
	{
		pos = object.position;
		if ( object.reverse && 0 === pos.x )
		{
			clearInterval( object.intevalID );
			return;
		}
			
		if (pos.x < 100 && !object.reverse)
			pos.x += 10;
		else 
		{
			pos.x -= 10;
			object.reverse = true;
		}
	}

}

walProto.stop = function()
{
	var ints = window.intervals || [],
		tms = window.timeouts || [];

	for (var i = 0; i < ints.length; i++)
		clearInterval(window.intervals[i]);

	for (var i = 0; i < tms.length; i++)
		clearTimeout(window.timeouts[i]);
}