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
	this._MapsSettings = settings.MapsSettings || [];	
	this._AllowFly = settings.AllowFly || true;	
	this._SpeedAnimInRoom = 0.05;
	this._Maps = [];		
	this._QueueAnimation = [];	
	this._Speed = 10;
	this._Factor = 10;
	this._Rendered = false;
	this._Container = null;
	this._Axis = null;
	this._Delta = 0;
	this._TLoadMap = null;	
	this._MapsLoaded = false;
	this._3DObjects = {};
	this.Renderer = null;
	this.Camera = null;
	this.Scene = null;
	this.House = null;
	this.Loader = null;
	this.Controls = null;
	this.House = null;
	this.PointLight = null;
	this.Clock = null;
	delete settings;
};

var walProto = Walker.prototype;

//-------------------Public Methods----------------------

walProto.init = function()
{
	this._initMaps();
	this._Container = this._ContainerID ? document.getElementById(this._ContainerID) : null;

	if (!this._Container) return;

	this._create3DContext();
	this.animate();
};

walProto.showAxis = function () 
{
	this._Axis = new THREE.AxisHelper(100);
	this.Scene.add( this._Axis );
}

walProto.animate = function (delta) 
{
	requestAnimationFrame( this.animate.bind(this) );
	if (!this.Clock)
		this.Clock = new THREE.Clock();
	delta = this.Clock.getDelta();

	if (this._AllowControls) 
		this.Controls.update(delta);
	// else
	// 	this._doQueueAnimation(delta);

	this.render();
};

walProto.render = function () 
{
	this.PointLight.position.copy( this.Camera.position );
	if (this.Camera.target)
		this.PointLight.lookAt(this.Camera.target);
	// this.PointLight.lookAt( this.Controls ? .target )
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
		{
			pos.x += 10;
			pos.y += 10;
			pos.z += 10;
		}
		else 
		{
			pos.x -= 10;
			pos.y -= 10;
			pos.z -= 10;
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

walProto.setAllowFly = function (value) 
{
	this._AllowFly = !!value;
};

//-------------------Private Methods----------------------

walProto._initMaps = function () 
{
	var id = 0,
		map, ms, i, len1;

	for (i = 0, len1 = this._MapsSettings.length; i < len1; i++)
	{
		ms = this._MapsSettings[i];
		map = new Map(ms);
		map.init();
		map.setId(id++);
		map.setLinking(ms.Linking)
		this._Maps.push(map);
	}

	this._TLoadMap = setTimeout((function(self){ self._checkLoadMaps() })(this), 200);
};

walProto._checkLoadMaps = function()
{
	var isLoaded = true, 
		map, i, len1;

	for (i = 0, len1 = this._Maps.length; i < len1; i++)
	{
		map = this._Maps[i];
		if (map.getLoaded()) continue;

		isLoaded = false;
		break;
	}

	if (isLoaded)
	{
		this._MapsLoaded = true;
		console.log("done!");
	}
	else 
		this._TLoadMap = setTimeout((function(self){ return function (){ self._checkLoadMaps()} })(this), 200);
};

walProto._flyAround = function (params) 
{
	if (!this._AllowFly) return;
	params.Step = params.Step || 1;
	this.Camera.position.set( Math.sin(params.Step)*300, 100, Math.cos(params.Step)*300 );
	// this.Camera.position.set( Math.sin(this.Clock.getElapsedTime())*300, 100, Math.cos(this.Clock.getElapsedTime())*300 );
	this.Camera.lookAt( this.Scene.position );
	params.Step += 0.03;
	if (!params.Timer)
		params.Timer = setTimeout((function(params){ return function(){ params.IsEnded = true; params.Timer = null;} })(params), 1000);
};

walProto._updateRooms = function (params) 
{
	var maps = this._Maps, 
		sets, i, len1;

	for (i = 0, len1 = maps.length; i < len1; i++)
		if (!maps[i].getIsEnded()) 
			return;

	params.IsEnded = true;

	for (i = 0, len1 = maps.length; i < len1; i++)
	{
		maps[i].setIsEnded(false);
		sets = params.RoomsSettings[maps[i].getId()];
		sets["iterator"] = 0;
		sets["position"] = null;
	}
};

walProto._getRoomSettings = function (params, room) 
{
	params.RoomsSettings = params.RoomsSettings || {};
	params.RoomsSettings[room.getId()] = params.RoomsSettings[room.getId()] || {};
	sets = params.RoomsSettings[room.getId()];

	sets["points"] = sets["points"] || room.getPointsTo3DWalk();
	sets["iterator"] = sets["iterator"] || 0;
	return sets;
};

walProto._getNextRoom = function () 
{
	var maps = this._Maps, 
		i, len1;

	for (i = 0, len1 = maps.length; i < len1; i++)
		if (!maps[i].getIsEnded()) 
			return maps[i];

	return maps[0];
};

walProto._getOffsetCoord = function (room, coord) 
{
	var geo = room.getGeometry(),
		linking = room.getLinking(),
		diffWidth = linking.width/geo.width,
		diffHeight = linking.height/geo.height;

	return (coord - geo.x) * diffWidth + linking.x;
};

walProto._setCamPositionRoom = function (room, sets) 
{
	var points = sets["points"],
		iterator = sets["iterator"],
		point = points[iterator],
		nextPoint = points[iterator + 1],
		y = room.getLinking().elevation,
		freq = this._SpeedAnimInRoom,	
		ofs = this._getOffsetCoord,
		rotateFreq = freq,
		position;
	
	sets["position"] = sets["position"] ||
		new THREE.Vector3
		( 
			ofs(room, point.xC), 
			y, 
			ofs(room, point.yC)
		);
	position = sets["position"];

	if (this.Camera.angle && Math.round(this.Camera.angle) !== Math.round(point.angle))
	{
		if (!sets["oldAngle"])
			sets["oldAngle"] = Math.round(this.Camera.angle);
		if (this.Camera.angle > point.angle)
			this.Camera.angle = this.Camera.angle - 1 * rotateFreq * 4 ;
		else
			this.Camera.angle = this.Camera.angle + 1 * rotateFreq * 4;
		// this.Camera.angle = this.Camera.angle - (sets["oldAngle"] - point.angle) * rotateFreq/10;
		sets["isAngleChanged"] = true;
	}
	else
	{
		this.Camera.angle = point.angle;
		sets["isAngleChanged"] = false;
		sets["oldAngle"] = null;
	}

	if (nextPoint && !sets["isAngleChanged"])
	{
		position.x = position.x - (ofs(room, point.xC) - ofs(room, nextPoint.xC)) * freq;
		position.z = position.z - (ofs(room, point.yC) - ofs(room, nextPoint.yC)) * freq;
	} 

	this.Camera.target = new THREE.Vector3
		( 
			position.x + 1 * Math.cos(this.Camera.angle * Math.PI / 180),
			y, 
			position.z - 1 * Math.sin(this.Camera.angle * Math.PI / 180)
		);
	this.Camera.lookAt( this.Camera.target );
	// this.Camera.lookAt( this.Scene.position );
	this.Camera.position.copy(position);
};

walProto._updateIterator = function (sets) 
{
	var speed = this._SpeedAnimInRoom;

	if (sets["isAngleChanged"]) return

	sets["freq"] = sets["freq"] || speed;
	if (sets["freq"] >= 1)
	{
		sets["iterator"] += 1;
		sets["freq"] = 0;
	}
	else
		sets["freq"] += speed;
};

walProto._flyInRooms = function (params) 
{
	// setTimeout((function(params){ return function(){ params.IsEnded = true} })(params), 1000);
	var room = this._getNextRoom(), 
		sets, points, iterator;

	sets = this._getRoomSettings(params, room);
	points = sets["points"];
	iterator = sets["iterator"];

	if (points.length === iterator)
		room.setIsEnded(true);
	else
		this._setCamPositionRoom(room, sets);

	this._updateIterator(sets);

	this._updateRooms(params);
};

walProto._wrapCallback = function (callback, params) 
{
	params = params || {};
	params.IsEnded = false
	return { Callback: callback, Params: params };
};

walProto._createQueueAction = function () 
{
	var queue = this._QueueAnimation,
		i, len1;
	//ïåðâîå äåéñòâèå - îáëåò äîìà âîêðóã
	queue.push( this._wrapCallback(this._flyAround) );
	//çàòåì ïîî÷åðåäíûé îáëåò êàæäîé êîìíàòû
	queue.push( this._wrapCallback(this._flyInRooms) );
};

walProto._giveNextQueueElem = function () 
{
	var queue = this._QueueAnimation,
		i, len1;

	for (i = 0, len1 = queue.length; i < len1; i++)
		if (!queue[i].Params.IsEnded) 
			return queue[i];

	//èíà÷å ñáðàñûâàåì ñòàòóñ çàêîí÷åííîñòè âñåì 
	for (i = 0, len1 = queue.length; i < len1; i++)
		queue[i].Params.IsEnded = false;

	return queue[0];
};

walProto._doQueueAnimation = function(delta)
{
	if (!this._Rendered || !this._MapsLoaded)
		return;

	var queue = this._QueueAnimation,
		action;
	//åñëè î÷åðåäü äåéñòâèé ïóñòà, ñîçäàäèì å¸ îäèí ðàç
	if (queue.length === 0)
		this._createQueueAction();

	action = this._giveNextQueueElem();
	if (action)
	{
		action.Params.Delta = delta;
		action.Callback.call(this, action.Params);
	}
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
	// var directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
	// directionalLight.position.set( 20, 50, 20 ).normalize();
	// this.Scene.add(directionalLight);
	//!debugEnd

	this.PointLight = new THREE.PointLight(0xffffff, 0.6);
	this.Scene.add(this.PointLight);

	if (this._ShowAxis)
		this.showAxis();

	if (this._AllowControls)
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

	this.render();
};

walProto._onLoadOBJFile = function (args) 
{
		this.House = args.Event.content;

		this.Scene.add(this.House);
		this._Rendered = true;
		this._fillListObjects();
		this.render();
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
