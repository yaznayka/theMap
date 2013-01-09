var Map = function (settings)
{
	this._SvgPath = settings.SvgPath,
	this._Svg = document.getElementsByTagName("svg")[0],//settings.SvgPath,
	this._RoomObj = null,
	this._StepSize = null,
	this._StartCell = null,
	this._Linking = null,		
	this._Route = [],
	this._RoomPoints = [],
	this._WayPoints = [],
	this._WayCells = [],
	this._TerrainMap = [],
	this._Barriers = [],
	this._SvgObjects = [],
	this._SearchTimeouts = [],
	this._PointsTo3DWalk = [],
	this._Door = { beginCoord: {}, endCoord: {} },
	this._Debug = true,
	this._DistanceFromWall = 0,
	this._DistanseLooking = 1,
	this._ProcentPathFreq = 5,
	this._IdRoom = "room",
	this._IsShowLooking = true,
	this._IsDiaganalAllow = false,
	this._IsRoundedAngle = false;	
	this._Geometry = null;
	this._Loaded = false;
	this._IsEnded = false;
	this._Id = 0;
};

var mapProto = Map.prototype;

mapProto.init = function()
{
	var container = document.createElement("div"),
		svg = document.createElement("object");
	svg.type = "image/svg+xml";
	svg.data = this._SvgPath;
	this.addEvent(svg, "load", this._onSvgMapLoaded, { Svg: svg});

	container.appendChild(svg);
	document.body.appendChild(container);
};

mapProto._onSvgMapLoaded = function(args)
{
	this._Svg = args.Svg.contentDocument ? args.Svg.contentDocument.childNodes[0] : null;
	this.search();
	this._Loaded = true;
};

mapProto.clearFoundWay = function()
{
	var i;
	for (i = 0, i = this._SvgObjects.length; i > 0; i--)
	{
		this._Svg.removeChild(this._SvgObjects.pop());
		
	};
	for (i = 0, i = this._SearchTimeouts.length; i > 0; i--)
	{
		clearTimeout(this._SearchTimeouts.pop());
	};
	this._Door = { beginCoord: {}, endCoord: {} };
	this._StartCell = null;
	this._Route = [];
	this._WayPoints = [];
	this._WayCells = [];
	this._TerrainMap = [];
	this._RoomPoints = [];
	this._Barriers = [];
	this._PointsTo3DWalk = [];
};

mapProto.setPathFreq = function(val)
{
	this._ProcentPathFreq = val;
}
	
mapProto.setShowLooking = function(val)
{
	this._IsShowLooking = !!val;
}
	
mapProto.setDistanceFromWall = function(val)
{
	this._DistanceFromWall = val;
}
	
mapProto.setDistanceLooking = function(val)
{
	this._DistanseLooking = val;
}
	
mapProto.setRoundedAngle = function(val)
{
	this._IsRoundedAngle = !!val;
}
	
mapProto.setAllowDiaganal = function(val)
{
	this._IsDiaganalAllow = !!val;
}
	
mapProto.search = function()
{
	this.clearFoundWay();
	this.fillPoints();
	this.fillBarriers();
	this.fillTerrainMap();	
}
	
mapProto.isPointInPoly = function (poly, pt)
{
	for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
		((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
		&& (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
		&& (c = !c);
	return c;
}
	
mapProto.isBoxInRoom = function (box)
{
	var points = [{x: box.x, y: box.y}, {x: box.x2, y: box.y},{x: box.x, y: box.y2},{x: box.x2, y: box.y2}],
		result = true;
	for (var i = 0; i < points.length; i++)
	{
		result &= this.isPointInPoly(this._RoomPoints, points[i]);
	}
	return !!result;
};	
	
mapProto.isPointInsideBBox = function (bbox, x, y) 
{
    return x >= bbox.x && x <= bbox.x2 && y >= bbox.y && y <= bbox.y2;
};
	
mapProto.isBBoxIntersect = function (bbox1, bbox2) 
{
    var i = this.isPointInsideBBox;
    return i(bbox2, bbox1.x, bbox1.y)
        || i(bbox2, bbox1.x2, bbox1.y)
        || i(bbox2, bbox1.x, bbox1.y2)
        || i(bbox2, bbox1.x2, bbox1.y2)
        || i(bbox1, bbox2.x, bbox2.y)
        || i(bbox1, bbox2.x2, bbox2.y)
        || i(bbox1, bbox2.x, bbox2.y2)
        || i(bbox1, bbox2.x2, bbox2.y2)
        || (bbox1.x < bbox2.x2 && bbox1.x > bbox2.x || bbox2.x < bbox1.x2 && bbox2.x > bbox1.x)
        && (bbox1.y < bbox2.y2 && bbox1.y > bbox2.y || bbox2.y < bbox1.y2 && bbox2.y > bbox1.y);
};
	
/**
 * Граббинг точек полилинии, для которых будет искаться
 * оптимальный маршрут
 */	
mapProto.isBoxIntersectBarriers = function(box)
{
	var i, len1, result = false;
	
	for (i = 0, len1 = this._Barriers.length; i < len1; i++)
	{
		result = result || this.isBBoxIntersect(box, this._Barriers[i])
		if (result) return true;
	}
	return false;
};
	
mapProto.fillDoorCoords = function(svgPoints)
{
	//заполняем коордианаты двери,
	//которые являются начальной и конечной точкой полилинии	
	var len = this._RoomObj.points.numberOfItems;
	
	this._Door.beginCoord.x = svgPoints.getItem(0).x;
	this._Door.beginCoord.y = svgPoints.getItem(0).y
	this._Door.endCoord.x = svgPoints.getItem(len - 1).x;
	this._Door.endCoord.y = svgPoints.getItem(len - 1).y		
};
	
mapProto.getDistanceFromWall = function()
{	
	return this._DistanceFromWall * this.getStepSize();	
}

mapProto.fillPoints = function()
{	
	var childsSVG = this._Svg.childNodes,
		coord, point, diff, dist, geo,
		previousCoord, nextCoord,
		elem, i, j, len;
	
	for (i in childsSVG)
	{
		elem = childsSVG[i];
		//пропускаем текстовые блоки
		if (elem.nodeName !== "polyline") continue;

		this._RoomObj = elem;
		if (this._RoomObj)
		{		
			this._RoomObj.setAttribute("id", this._IdRoom);
			for (j = 1, len = this._RoomObj.points.numberOfItems; j < len - 1; j++)
			{
				point = this._RoomObj.points.getItem(j);
				this._RoomPoints.push({ x: point.x, y: point.y });
			};
			
			this.fillDoorCoords(this._RoomObj.points);
			dist = this.getDistanceFromWall();
			
			for (j = 1, len = this._RoomObj.points.numberOfItems; j < len - 1; j++)
			{
				point = this._RoomObj.points.getItem(j);
				coord = { x: point.x, y: point.y };
				previousCoord = this._RoomObj.points.getItem(j - 1);
				nextCoord = this._RoomObj.points.getItem(j + 1);
				if (coord.x === previousCoord.x)
				{
					coord.x = coord.x > nextCoord.x ? coord.x - dist : coord.x + dist;
					coord.y = coord.y > previousCoord.y ? coord.y - dist : coord.y + dist;
				} else
				{
					coord.x = coord.x > previousCoord.x ? coord.x - dist : coord.x + dist;
					coord.y = coord.y > nextCoord.y ? coord.y - dist : coord.y + dist;
				}
				//если точка не попала в границы комнаты,
				//нужно зеркально отразить добавленную дистанцию
				if (!this.isPointInPoly(this._RoomPoints, coord))
				{
					diff = Math.abs(point.x - coord.x);
					coord.x = coord.x < point.x ? point.x + diff : point.x - diff;
					coord.y = coord.y < point.y ? point.y + diff : point.y - diff;
				}
				this._WayPoints.push({ x: coord.x, y: coord.y });
			};
			break;
		}
	}
};
	
mapProto.fillBarriers = function()
{	
	var childsSVG = this._Svg.childNodes,
		bBox, elem, elemBox,
		i;
	for (i in childsSVG)
	{
		elem = childsSVG[i];
		//пропускаем текстовые блоки
		if (elem.nodeType !== 1 || elem.getAttribute("id") === this._IdRoom) continue;
		
		bBox = elem.getBBox();
		elemBox = 
		{
			x: bBox.x,
			y: bBox.y,
			x2: bBox.x + bBox.width,
			y2: bBox.y + bBox.height,
		};
		this._Barriers.push(elemBox);
	}
};
	
mapProto.drawRect = function(cell)
{
	var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	rect.setAttribute("class", "testRect"); 
	rect.setAttribute("fill","transparent");
	rect.setAttribute("fill-opacity", 0.4);
	rect.setAttribute("stroke","black");
	rect.setAttribute("stroke-opacity",0.2);			
	rect.setAttribute("stroke-width","1");
	rect.setAttribute("x", cell.x);
	rect.setAttribute("y", cell.y);
	rect.setAttribute("width", cell.x2 - cell.x);
	rect.setAttribute("height", cell.y2 - cell.y);
	this._Svg.appendChild(rect);	
	this._SvgObjects.push(rect);
	return rect;
}
	
mapProto.drawCircle = function(cell, radius)
{
	var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	circle.setAttribute("class", "testcircle"); 
	circle.setAttribute("fill","blue");
	circle.setAttribute("fill-opacity", 1);
	circle.setAttribute("stroke","blue");
	circle.setAttribute("stroke-opacity",1);			
	circle.setAttribute("stroke-width","1");
	circle.setAttribute("cx", cell.xC);
	circle.setAttribute("cy", cell.yC);
	circle.setAttribute("r", radius || this.getStepSize()/4);
	this._Svg.appendChild(circle);	
	this._SvgObjects.push(circle);
}	
	
mapProto.makeRoundAngle = function(fPoint, sPoint, isRoundGrow)
{
	var strD ="", middlePoint = {};
	middlePoint.
	x = cell.xC === middleCell.xC ? cell.xC : 
		middleCell.xC + stepSize*Math.cos(this.getAngle(cell.xC - middleCell.xC, 0) * pi/180);
	y = cell.yC === middleCell.yC ? cell.yC : 
		middleCell.yC + stepSize*Math.sin(this.getAngle(0, cell.yC - middleCell.yC) * pi/180);
	
	strD += "M" + fPoint.x + "," + fPoint.y + " Q" + middleCell.xC + "," + middleCell.yC + " ";
	
	x = endCell.xC === middleCell.xC ? endCell.xC : 
		middleCell.xC + stepSize*Math.cos(this.getAngle(endCell.xC - middleCell.xC, 0) * pi/180);
	y = endCell.yC === middleCell.yC ? endCell.yC : 
		middleCell.yC + stepSize*Math.sin(this.getAngle(0, endCell.yC - middleCell.yC) * pi/180);	
			
	strD += x + "," + y + " ";
	
	return strD;
};
	
mapProto.drawPath = function(path)
{
	var svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'),
		endPoint = path[path.length - 1].cell,
		strD = "M" + endPoint.xC + ", " + endPoint.yC + " ",
		stepSize = this.getStepSize(),
		point, nextPoint, x, y,
		pi = Math.PI,
		cell, middleCell, endCell,
		step, i, len;
	if (this._IsRoundedAngle)
	{
		for (i = 0, len1 = path.length - 1; i < len1; i++)
		{
			cell = path[i].cell;
			middleCell = path[i + 1] ? path[i + 1].cell : "";
			endCell = path[i + 2] ? path[i + 2].cell : "";
			
			if ((i + 2 <= len1) && cell.xC !== endCell.xC && cell.yC !== endCell.yC)
			{



			}				
			else
				strD += "L" + path[i].cell.xC + "," + path[i].cell.yC + " ";
		}
		strD += "L" + path[path.length - 1].cell.xC + "," + path[path.length - 1].cell.yC + " Z";
	}
	else
	{
		for (i = 0, len1 = path.length - 1; i < len1; i++)
			strD += "L" + path[i].cell.xC + "," + path[i].cell.yC + " ";
		strD += "Z";		
	}
	
	svgPath.setAttribute("d", strD); 
	svgPath.setAttribute("fill", "transparent"); 
	svgPath.setAttribute("stroke","red");		
	svgPath.setAttribute("stroke-width","1");
	this._Svg.appendChild(svgPath);	
	this._SvgObjects.push(svgPath);
	
	for (i = 0, len1 = svgPath.getTotalLength(), step = (len1 / (len1 * this._ProcentPathFreq/100)); i < len1; i += step)
	{
	
		point = 
		{
			xC: svgPath.getPointAtLength(i).x, 
			yC: svgPath.getPointAtLength(i).y
		};
		this._PointsTo3DWalk.push(point);
		this.drawCircle(point, 1);
		
		//вектор взгляда будет направлен на DistanseLooking шагов вперед
		//или на последнюю точку
		nextPoint = 
		{
			xC: svgPath.getPointAtLength(i + this._DistanseLooking*step).x, 
			yC: svgPath.getPointAtLength(i + this._DistanseLooking*step).y
		};

		x = nextPoint.xC - point.xC;
		y = point.yC - nextPoint.yC;
		point.angle = this.getAngle(x, y);					
	}
	if (this._IsShowLooking) this.showArrows();
}	
	
mapProto.showArrows = function()
{
	var i, len1;
	for (i = 1, len1 = this._PointsTo3DWalk.length; i < len1; i++)
	{
		this._SearchTimeouts.push(
			(function(point, self)
			{
				return setTimeout(function(){ self.drawArrow(point) }, i*100)
			}) (this._PointsTo3DWalk[i], this)
		);
		
	}
}
	
mapProto.drawArrow = function(point)
{
	var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		leftSide = document.createElementNS('http://www.w3.org/2000/svg', 'line'),
		RightSide = document.createElementNS('http://www.w3.org/2000/svg', 'line'),
		halfSize = this.getStepSize()/2,
		color = "yellow",
		sideAngle = 70,
		sideLength = halfSize,
		pi = Math.PI,
		leftAngle = pi*(sideAngle + point.angle)/180,
		rightAngle = pi*(point.angle - sideAngle)/180,
		xAng = Math.cos((point.angle/180)*pi)*halfSize,
		yAng = Math.sin((point.angle/180)*pi)*halfSize,
		x1 = point.xC - xAng,
		y1 = point.yC + yAng,
		x2 = point.xC + xAng,
		y2 = point.yC - yAng;
		
	line.setAttribute("class", "arrow"); 
	line.setAttribute("stroke",color);
	line.setAttribute("stroke-opacity",1);			
	line.setAttribute("stroke-width","2");
	line.setAttribute("x1", x1);
	line.setAttribute("x2", x2);
	line.setAttribute("y1", y1);
	line.setAttribute("y2", y2);

	leftSide.setAttribute("class", "arrow"); 
	leftSide.setAttribute("stroke",color);
	leftSide.setAttribute("stroke-opacity",1);			
	leftSide.setAttribute("stroke-width","2");
	RightSide.setAttribute("class", "arrow"); 
	RightSide.setAttribute("stroke",color);
	RightSide.setAttribute("stroke-opacity",1);			
	RightSide.setAttribute("stroke-width","2");
	
	
	leftSide.setAttribute("x1", x2);
	leftSide.setAttribute("y1", y2);
	leftSide.setAttribute("x2", x2 - sideLength*Math.sin(leftAngle));
	leftSide.setAttribute("y2", y2 - sideLength*Math.cos(leftAngle));	
	RightSide.setAttribute("x1", x2);
	RightSide.setAttribute("y1", y2);		
	RightSide.setAttribute("x2", x2 + sideLength*Math.sin(rightAngle));
	RightSide.setAttribute("y2", y2 + sideLength*Math.cos(rightAngle));	
		
	this._Svg.appendChild(line);	
	this._SvgObjects.push(line);
	this._Svg.appendChild(leftSide);	
	this._Svg.appendChild(RightSide);	
	this._SvgObjects.push(leftSide);
	this._SvgObjects.push(RightSide);
}	
	
mapProto.debugMap = function(cell, isCellInRoom, isCellInBarrier)
{
	var rect = this.drawRect(cell);
	
	if (isCellInRoom)
	{
		if (!isCellInBarrier) rect.setAttribute("fill","green");
		else rect.setAttribute("fill","red");
	} else rect.setAttribute("fill","black");
};
	
mapProto.debugStartOrWayCell = function (cell, isStartCell)
{
	var rect = this.drawRect(cell);
	
	if (isStartCell) 
		rect.setAttribute("fill","blue");
	else
		rect.setAttribute("fill","white");
}
	
mapProto.showRoute = function (arrOfPoints)
{
	//рисуем получивщуюся траекторию
	var path = [arrOfPoints[0]],
		prevCell, cell, i, len1;
	
	for (i = 1, len1 = arrOfPoints.length; i < len1; i++)
	{	
		cell = arrOfPoints[i].cell;
		prevCell = path[path.length - 1].cell;
		if (cell.xC !== prevCell.xC && cell.yC !== prevCell.yC) 
		{
			path.push(arrOfPoints[i - 1]);
		}
	}
	path.push(arrOfPoints[arrOfPoints.length - 1]);
	
	this.drawPath(path);
}
	
mapProto.fillWayCells = function (cell, minDiffDistWayP) 
{
	var wayPoint,
		diffDist,
		i, len1;
	
    for (i = 0, len1 = this._WayPoints.length; i < len1; i++)
	{
		wayPoint = this._WayPoints[i];
		
		diffDist = Math.round(Math.sqrt(Math.pow(cell.x + this.getStepSize()/2 - wayPoint.x, 2) + 
			Math.pow(cell.y + this.getStepSize()/2 - wayPoint.y, 2)));
		
		if (diffDist < minDiffDistWayP[i])
		{
			this._WayCells[i] = cell;
			minDiffDistWayP[i] = diffDist;
		}
	}
};
	
mapProto.fillStartCell = function(cell, minDiffDist)
{
	var doorAvgX = this._Door.beginCoord.x === this._Door.endCoord.x ? this._Door.beginCoord.x :  
			Math.abs(this._Door.beginCoord.x - this._Door.endCoord.x)/2 + Math.min(this._Door.beginCoord.x, this._Door.endCoord.x),
		doorAvgY = this._Door.beginCoord.y === this._Door.endCoord.y ? this._Door.beginCoord.y : 
			Math.abs(this._Door.beginCoord.y - this._Door.endCoord.y)/2 + Math.min(this._Door.beginCoord.y, this._Door.endCoord.y),
		doorCoordAvg = { x: doorAvgX, y: doorAvgY },
		diffDist = Math.round(Math.sqrt(Math.pow(cell.x + this.getStepSize()/2 - doorCoordAvg.x, 2) + Math.pow(cell.y + this.getStepSize()/2 - doorCoordAvg.y, 2)));
		
	if (diffDist > minDiffDist) return minDiffDist;
	
	this._StartCell = cell;
	return diffDist;	
};
	
mapProto.fillOnlyUnicWayCells = function()
{
	var unicWayCells = [], 
		isAlredyAdded = false, 
		i, j, len1, len2;
	
	for (i = 0, len1 = this._WayCells.length; i < len1; i++)
	{
		for (j = 0, len2 = unicWayCells.length; j < len2; j++)
		{
			if (unicWayCells[j].x !== this._WayCells[i].x || unicWayCells[j].y !== this._WayCells[i].y ||
				unicWayCells[j].x2 !== this._WayCells[i].x2 || unicWayCells[j].y2 !== this._WayCells[i].y2) continue;
			
			isAlredyAdded = true;
			break;
		}
		if (!isAlredyAdded) unicWayCells.push(this._WayCells[i]);
		isAlredyAdded = false;
	}
	for (i = 0, len1 = unicWayCells.length; i < len1; i++)
	{
		if (unicWayCells[i].x !== this._StartCell.x || unicWayCells[i].y !== this._StartCell.y ||
			unicWayCells[i].x2 !== this._StartCell.x2 || unicWayCells[i].y2 !== this._StartCell.y2) continue;
		unicWayCells.splice(i, 1);
		break;
	}

	this._WayCells = unicWayCells;
};
	
mapProto.fillTerrainMap = function()
{
	var roomBox = this._RoomObj.getBBox(),
		stepSize = this.getStepSize(),
		isCellInRoom = false, 
		isCellInBarrier = false,
		minDiffDist = Infinity, 
		diffDist, 
		minDiffDistWayP = [],
		pointOfMap,
		x, y, xAbs, yAbs,
		cell, i, j, len1, len2;
		
	for (i = 0, len1 = this._WayPoints.length; i < len1; i++)
		minDiffDistWayP.push(Infinity);
		
	this._TerrainMap = [];
	for (x = 0, xAbs = roomBox.x, len1 =  roomBox.x +  roomBox.width; xAbs < len1; xAbs += stepSize, x++)
	{
		this._TerrainMap[x] = [];
		for (y = 0, yAbs =  roomBox.y, len2 =  roomBox.y + roomBox.height; yAbs < len2; yAbs += stepSize, y++)
		{
			cell = { 
				x: xAbs, 
				y: yAbs, 
				x2: xAbs + stepSize, 
				y2: yAbs + stepSize, 
				xC: Math.round(xAbs + stepSize/2),
				yC: Math.round(yAbs + stepSize/2),
				pointOfMap: pointOfMap
			};
			
			pointOfMap = { xAbs: xAbs, yAbs: yAbs, x: x, y: y, cell: cell };
			this._TerrainMap[x][y] = pointOfMap;
			
			cell.pointOfMap = pointOfMap;
			
			if (this.isBoxInRoom(cell)) 
			{
				isCellInRoom = true;
				isCellInBarrier = this.isBoxIntersectBarriers(cell);
			} else isCellInRoom = false;
			
			if (isCellInRoom && !isCellInBarrier)
			{
				minDiffDist = this.fillStartCell(cell, minDiffDist, pointOfMap);
				this.fillWayCells(cell, minDiffDistWayP);
				this._TerrainMap[x][y].type = GraphNodeType.OPEN;
			} else
				this._TerrainMap[x][y].type = GraphNodeType.WALL;
			
			if (this._Debug) this.debugMap(cell, isCellInRoom, isCellInBarrier);
		}
	}
	if (this._Debug) 
	{
		this.debugStartOrWayCell(this._StartCell, true);
		for (i = 0, len1 = this._WayCells.length; i < len1; i++)
			this.debugStartOrWayCell(this._WayCells[i], false);
	}
	this.fillOnlyUnicWayCells();
	this.createRoute();
};
	
mapProto.createRoute = function()
{
	var graph = new Graph(this._TerrainMap),
		routeCells = [].concat(this._StartCell, this._WayCells, this._StartCell),
		start, end, cell, nextCell, 
		cellMiddle, nextCellMiddle,
		x, y, angle,
		i, len1;
		
	for (i = 0, len1 = routeCells.length; i < len1 - 1; i++)
	{
		start = graph.nodes[routeCells[i].pointOfMap.x][routeCells[i].pointOfMap.y];
		end = graph.nodes[routeCells[i+1].pointOfMap.x][routeCells[i+1].pointOfMap.y];
		this._Route = this._Route.concat(astar.search(graph.nodes, start, end, this._IsDiaganalAllow));
	}
	for (i = 0, len1 = this._Route.length; i < len1; i++)
	{
		cell = this._Route[i].cell;
	}
	this.showRoute(this._Route);
}
	
mapProto.getAngle = function(x, y)
{
	if(x==0) return (y>0) ? 90 : 270; 
	var a = Math.atan(y/x)*180/Math.PI; 
	a = (x > 0) ? a+0 : a+180; 
	return a; 
}
	
mapProto.getStepSize = function()
{
	if (this._StepSize) return this._StepSize;
	
	return this._Door.beginCoord.x === this._Door.endCoord.x ? 
		Math.round(Math.abs(this._Door.beginCoord.y - this._Door.endCoord.y) * 3/5) : 
		Math.round(Math.abs(this._Door.beginCoord.x - this._Door.endCoord.x) * 3/5)
};
	
mapProto.setStepSize = function(step)
{
	this._StepSize = step;
};

/**
 * Нахождение пересечений SVG элементов с точкой по переданным координатам
 */	
mapProto.getInteresectedElements = function(x, y, width, height)
{
    var rpos = this._Svg.createSVGRect();
    rpos.x = x;
    rpos.y = y;
    rpos.width = width;
	rpos.height = height;
	return this._Svg.getIntersectionList(rpos);
}

mapProto.addEvent = function(elem, eventType, callback, args) 
{
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

mapProto.getPointsTo3DWalk = function() 
{
	return this._PointsTo3DWalk;
}

mapProto.getLoaded = function() 
{
	return this._Loaded;
}

mapProto.getGeometry = function() 
{
	if (!this._RoomObj)
		return;

	var geo = this._RoomObj.getBoundingClientRect();
	//возвращаем координаты левого верхнего угла, выосту и ширину
	return { x: geo.left, y: geo.top, width: geo.width, height: geo.height };
}

mapProto.setIsEnded = function(value) 
{
	this._IsEnded = !!value;
};

mapProto.getIsEnded = function() 
{
	return this._IsEnded;
};

mapProto.setId = function(value) 
{
	this._Id = value;
};

mapProto.getId = function() 
{
	return this._Id;
};

mapProto.setLinking = function(value) 
{
	this._Linking = value;
};

mapProto.getLinking = function() 
{
	return this._Linking;
};