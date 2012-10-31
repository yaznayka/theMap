var Map = function ()
{
	var Self = this,
		Svg = document.getElementsByTagName("svg")[0],
		RoomObj = null,
		StepSize = null,
		StartCell = null,
		Route = [],
		WayPoints = [],
		WayCells = [],
		TerrainMap = [],
		Barriers = [],
		Door = { beginCoord: {}, endCoord: {} },
		Debug = true,
		IdRoom = "room";
		
	Self.init = function()
	{
		fillWayPoints();
		fillBarriers();
		fillTerrainMap();	
	};
	Self.Svg = Svg;
	Self.WayPoints = WayPoints;
	var test = function()
	{
		document.onclick = function(e)
		{	
			// var svg = document.getElementsByTagName("svg")[0];
			// var svgRect = svg.getBoundingClientRect();
			var scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft; 
			var scrollTop = document.documentElement.scrollTop || document.body.scrollTop; 
			var x = e.pageX - scrollLeft;
			var y = e.pageY - scrollTop;
			var test = isPointInPoly(WayPoints, {x: x, y: y});
			console.debug(test);
			
			// var rpos = svg.createSVGRect();
			// rpos.x = e.pageX - 8;
			// rpos.y = e.pageY - 8;
			// rpos.width = 60;
			// rpos.height = 60;
			// console.log(svg.getIntersectionList(rpos));
			
			// var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
			// rect.setAttribute("id", "myrect"); 
			// rect.setAttribute("fill","transparent");
			// rect.setAttribute("fill-opacity", 0.2);
			// rect.setAttribute("stroke","red");

			// rect.setAttribute("x", x);
			// rect.setAttribute("y", y);
			// rect.setAttribute("width", 60);
			// rect.setAttribute("height", 60);
			// svg.appendChild(rect);
		};

	}
	function isPointInPoly(poly, pt)
	{
		for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
			((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
			&& (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
			&& (c = !c);
		return c;
	}
	
	function isBoxInRoom(box)
	{
		var points = [{x: box.x, y: box.y}, {x: box.x2, y: box.y},{x: box.x, y: box.y2},{x: box.x2, y: box.y2}],
			result = true;
		for (var i = 0; i < points.length; i++)
		{
			result &= isPointInPoly(WayPoints, points[i]);
		}
		return !!result;
	};	
	
	var isPointInsideBBox = function (bbox, x, y) 
	{
        return x >= bbox.x && x <= bbox.x2 && y >= bbox.y && y <= bbox.y2;
    };
	
	var isBBoxIntersect = function (bbox1, bbox2) {
        var i = isPointInsideBBox;
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
	var isBoxIntersectBarriers = function(box)
	{
		var i, len1, result = false;
		
		for (i = 0, len1 = Barriers.length; i < len1; i++)
		{
			result = result || isBBoxIntersect(box, Barriers[i])
			if (result) return true;
		}
		return false;
	};
	
	var fillWayPoints = function()
	{	
		var childsSVG = Svg.childNodes,
			coord = {},
			elem, i, j, len;
		for (i in childsSVG)
		{
			elem = childsSVG[i];
			//пропускаем текстовые блоки
			if (elem.nodeName !== "polyline") continue;

			RoomObj = elem;
			if (RoomObj)
			{		
				RoomObj.setAttribute("id", IdRoom);
				for (j = 0, len = RoomObj.points.numberOfItems; j < len; j++)
				{
					coord = RoomObj.points.getItem(j);
					if (j === 0)
					{
						Door.beginCoord.x = coord.x;
						Door.beginCoord.y = coord.y
					} else if (j === len - 1)
					{
						Door.endCoord.x = coord.x;
						Door.endCoord.y = coord.y					
					} else WayPoints.push({ x: coord.x, y: coord.y });
				};
				break;
			}
		}
	};
	
	var fillBarriers = function()
	{	
		var childsSVG = Svg.childNodes,
			bBox, elem, elemBox,
			i;
		for (i in childsSVG)
		{
			elem = childsSVG[i];
			//пропускаем текстовые блоки
			if (elem.nodeType !== 1 || elem.getAttribute("id") === IdRoom) continue;
			
			bBox = elem.getBBox();
			elemBox = 
			{
				x: bBox.x,
				y: bBox.y,
				x2: bBox.x + bBox.width,
				y2: bBox.y + bBox.height,
			};
			Barriers.push(elemBox);
			
		}
	};
	
	var drawRect = function(cell)
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
		Svg.appendChild(rect);	
		return rect;
	}
	
	var drawCircle = function(point)
	{
		var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
		circle.setAttribute("class", "testcircle"); 
		circle.setAttribute("fill","blue");
		circle.setAttribute("fill-opacity", 0.4);
		circle.setAttribute("stroke","blue");
		circle.setAttribute("stroke-opacity",0.2);			
		circle.setAttribute("stroke-width","1");
		circle.setAttribute("cx", point.xAbs + getStepSize()/2);
		circle.setAttribute("cy", point.yAbs + getStepSize()/2);
		circle.setAttribute("r", getStepSize()/4);
		Svg.appendChild(circle);	
	}	
	
	var debugMap = function(cell, isCellInRoom, isCellInBarrier)
	{
		var rect = drawRect(cell);
		
		if (isCellInRoom)
		{
			if (!isCellInBarrier) rect.setAttribute("fill","green");
			else rect.setAttribute("fill","red");
		} else rect.setAttribute("fill","black");
	};
	
	var debugStartOrWayCell = function (cell, isStartCell)
	{
		var rect = drawRect(cell);
		
		if (isStartCell) 
			rect.setAttribute("fill","blue");
		else
			rect.setAttribute("fill","white");
	}
	
	var debugShowRoute = function (arrOfPoints)
	{
		var i, len1;
		for (i = 0, len1 = arrOfPoints.length; i < len1; i++)
		{
			(function (point, i) 
			{
				setTimeout(function(){ drawCircle(point) }, i*100);
			}
			)(arrOfPoints[i], i)
			
		}
	}
	
	var fillWayCells = function (cell, minDiffDistWayP) 
	{
		var wayPoint,
			diffDist,
			i, len1;
		
        for (i = 0, len1 = WayPoints.length; i < len1; i++)
		{
			wayPoint = WayPoints[i];
			
			diffDist = Math.round(Math.sqrt(Math.pow(cell.x + getStepSize()/2 - wayPoint.x, 2) + Math.pow(cell.y + getStepSize()/2 - wayPoint.y, 2)));
			
			if (diffDist < minDiffDistWayP[i])
			{
				WayCells[i] = cell;
				minDiffDistWayP[i] = diffDist;
			}
		}
    };
	
	var fillStartCell = function(cell, minDiffDist)
	{
		var doorAvgX = Door.beginCoord.x === Door.endCoord.x ? Door.beginCoord.x :  
				Math.abs(Door.beginCoord.x - Door.endCoord.x)/2 + Math.min(Door.beginCoord.x, Door.endCoord.x),
			doorAvgY = Door.beginCoord.y === Door.endCoord.y ? Door.beginCoord.y : 
				Math.abs(Door.beginCoord.y - Door.endCoord.y)/2 + Math.min(Door.beginCoord.y, Door.endCoord.y),
			doorCoordAvg = { x: doorAvgX, y: doorAvgY },
			diffDist = Math.round(Math.sqrt(Math.pow(cell.x + getStepSize()/2 - doorCoordAvg.x, 2) + Math.pow(cell.y + getStepSize()/2 - doorCoordAvg.y, 2)));
			
		if (diffDist > minDiffDist) return minDiffDist;
		
		StartCell = cell;
		return diffDist;	
	};
	
	var fillOnlyUnicWayCells = function()
	{
		var unicWayCells = [], 
			isAlredyAdded = false, 
			i, j, len1, len2;
		
		for (i = 0, len1 = WayCells.length; i < len1; i++)
		{
			for (j = 0, len2 = unicWayCells.length; j < len2; j++)
			{
				if (unicWayCells[j].x !== WayCells[i].x || unicWayCells[j].y !== WayCells[i].y ||
					unicWayCells[j].x2 !== WayCells[i].x2 || unicWayCells[j].y2 !== WayCells[i].y2) continue;
				
				isAlredyAdded = true;
				break;
			}
			if (!isAlredyAdded) unicWayCells.push(WayCells[i]);
			isAlredyAdded = false;
		}
		for (i = 0, len1 = unicWayCells.length; i < len1; i++)
		{
			if (unicWayCells[i].x !== StartCell.x || unicWayCells[i].y !== StartCell.y ||
				unicWayCells[i].x2 !== StartCell.x2 || unicWayCells[i].y2 !== StartCell.y2) continue;
			unicWayCells.splice(i, 1);
			break;
		}

		WayCells = unicWayCells;
	};
	
	var fillTerrainMap = function()
	{
		var roomBox = RoomObj.getBBox(),
			StepSize = getStepSize(),
			isCellInRoom = false, isCellInBarrier = false,
			minDiffDist = Infinity, diffDist, 
			minDiffDistWayP = [],
			pointOfMap,
			x, y, xAbs, yAbs,
			cell, i, j, len1, len2;
			
		for (i = 0, len1 = WayPoints.length; i < len1; i++)
			minDiffDistWayP.push(Infinity);
			
		TerrainMap = [];
		for (x = 0, xAbs = roomBox.x, len1 =  roomBox.x +  roomBox.width; xAbs < len1; xAbs += StepSize, x++)
		{
			TerrainMap[x] = [];
			for (y = 0, yAbs =  roomBox.y, len2 =  roomBox.y + roomBox.height; yAbs < len2; yAbs += StepSize, y++)
			{
				pointOfMap = { xAbs: xAbs, yAbs: yAbs, x: x, y: y };
				TerrainMap[x][y] = pointOfMap;
				
				cell = { x: xAbs, y: yAbs, x2: xAbs + StepSize, y2: yAbs + StepSize, pointOfMap: pointOfMap};
				
				if (isBoxInRoom(cell)) 
				{
					isCellInRoom = true;
					isCellInBarrier = isBoxIntersectBarriers(cell);
				} else isCellInRoom = false;
				
				if (isCellInRoom && !isCellInBarrier)
				{
					minDiffDist = fillStartCell(cell, minDiffDist, pointOfMap);
					fillWayCells(cell, minDiffDistWayP);
					TerrainMap[x][y].type = GraphNodeType.OPEN;
				} else
					TerrainMap[x][y].type = GraphNodeType.WALL;
				
				if (Debug) debugMap(cell, isCellInRoom, isCellInBarrier);
			}
		}
		if (Debug) 
		{
			debugStartOrWayCell(StartCell, true);
			for (i = 0, len1 = WayCells.length; i < len1; i++)
				debugStartOrWayCell(WayCells[i], false);
		}
		fillOnlyUnicWayCells();
		createRoute();
	};
	
	var createRoute = function()
	{
		var graph = new Graph(TerrainMap),
			routeCells = [].concat(StartCell, WayCells, StartCell),
			start, end,
			i, len1;
			
		for (i = 0, len1 = routeCells.length; i < len1 - 1; i++)
		{
			start = graph.nodes[routeCells[i].pointOfMap.x][routeCells[i].pointOfMap.y];
			end = graph.nodes[routeCells[i+1].pointOfMap.x][routeCells[i+1].pointOfMap.y];
			Route = Route.concat(astar.search(graph.nodes, start, end, false));
		}
		if (Debug) debugShowRoute(Route);
	}
	
	var getStepSize = function()
	{
		return 15;
		return Door.beginCoord.x === Door.endCoord.x ? 
			Math.round(Math.abs(Door.beginCoord.y - Door.endCoord.y) * 3/4) : 
			Math.round(Math.abs(Door.beginCoord.x - Door.endCoord.x) * 3/4)
	};
	/**
	 * Нахождение пересечений SVG элементов с точкой по переданным координатам
	 */	
    var getInteresectedElements = function(x, y, width, height)
    {
        var rpos = Svg.createSVGRect();
        rpos.x = x;
        rpos.y = y;
        rpos.width = width;
		rpos.height = height;
		return Svg.getIntersectionList(rpos);
    }
}