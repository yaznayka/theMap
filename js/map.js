﻿var Map = function ()
{
	var Self = this,
		Svg = document.getElementsByTagName("svg")[0],
		RoomObj = null,
		StepSize = null,
		StartCell = null,
		Route = [],
		RoomPoints = [],
		WayPoints = [],
		WayCells = [],
		TerrainMap = [],
		Barriers = [],
		SvgObjects = [],
		SearchTimeouts = [],
		PointsTo3DWalk = [],
		Door = { beginCoord: {}, endCoord: {} },
		Debug = true,
		DistanceFromWall = 0,
		DistanseLooking = 1,
		ProcentPathFreq = 5,
		IdRoom = "room",
		isShowLooking = true,
		isDiaganalAllow = false,
		isRoundedAngle = false;
		
	var clearFoundWay = function()
	{
		var i;
		for (i = 0, i = SvgObjects.length; i > 0; i--)
		{
			Svg.removeChild(SvgObjects.pop());
			
		};
		for (i = 0, i = SearchTimeouts.length; i > 0; i--)
		{
			clearTimeout(SearchTimeouts.pop());
		};
		Door = { beginCoord: {}, endCoord: {} };
		StartCell = null;
		Route = [];
		WayPoints = [];
		WayCells = [];
		TerrainMap = [];
		RoomPoints = [];
		Barriers = [];
		PointsTo3DWalk = [];
	}
	
	Self.setPathFreq = function(val)
	{
		ProcentPathFreq = val;
	}
	
	Self.setShowLooking = function(val)
	{
		isShowLooking = !!val;
	}
	
	Self.setDistanceFromWall = function(val)
	{
		DistanceFromWall = val;
	}
	
	Self.setDistanceLooking = function(val)
	{
		DistanseLooking = val;
	}
	
	Self.setRoundedAngle = function(val)
	{
		isRoundedAngle = !!val;
	}
	
	Self.setAllowDiaganal = function(val)
	{
		isDiaganalAllow = !!val;
	}
	
	Self.clearFoundWay = clearFoundWay;
	
	Self.search = function()
	{
		clearFoundWay();
		fillPoints();
		fillBarriers();
		fillTerrainMap();	
	}
	
	Self.Svg = Svg;
	Self.WayPoints = WayPoints;

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
			result &= isPointInPoly(RoomPoints, points[i]);
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
	
	var fillDoorCoords = function(svgPoints)
	{
		//заполняем коордианаты двери,
		//которые являются начальной и конечной точкой полилинии	
		var len = RoomObj.points.numberOfItems;
		
		Door.beginCoord.x = svgPoints.getItem(0).x;
		Door.beginCoord.y = svgPoints.getItem(0).y
		Door.endCoord.x = svgPoints.getItem(len - 1).x;
		Door.endCoord.y = svgPoints.getItem(len - 1).y		
	};
	
	var getDistanceFromWall = function()
	{	
		return DistanceFromWall * getStepSize();	
	}
	var fillPoints = function()
	{	
		var childsSVG = Svg.childNodes,
			coord, point, diff, dist,
			previousCoord, nextCoord,
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
				for (j = 1, len = RoomObj.points.numberOfItems; j < len - 1; j++)
				{
					point = RoomObj.points.getItem(j);
					RoomPoints.push({ x: point.x, y: point.y });
				};
				
				fillDoorCoords(RoomObj.points);
				dist = getDistanceFromWall();
				
				for (j = 1, len = RoomObj.points.numberOfItems; j < len - 1; j++)
				{
					point = RoomObj.points.getItem(j);
					coord = { x: point.x, y: point.y };
					previousCoord = RoomObj.points.getItem(j - 1);
					nextCoord = RoomObj.points.getItem(j + 1);
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
					if (!isPointInPoly(RoomPoints, coord))
					{
						diff = Math.abs(point.x - coord.x);
						coord.x = coord.x < point.x ? point.x + diff : point.x - diff;
						coord.y = coord.y < point.y ? point.y + diff : point.y - diff;
					}
					WayPoints.push({ x: coord.x, y: coord.y });
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
		SvgObjects.push(rect);
		return rect;
	}
	
	var drawCircle = function(cell, radius)
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
		circle.setAttribute("r", radius || getStepSize()/4);
		Svg.appendChild(circle);	
		SvgObjects.push(circle);
	}	
	
	var makeRoundAngle = function(fPoint, sPoint, isRoundGrow)
	{
		var strD ="", middlePoint = {};
		middlePoint.
		x = cell.xC === middleCell.xC ? cell.xC : 
			middleCell.xC + stepSize*Math.cos(getAngle(cell.xC - middleCell.xC, 0) * pi/180);
		y = cell.yC === middleCell.yC ? cell.yC : 
			middleCell.yC + stepSize*Math.sin(getAngle(0, cell.yC - middleCell.yC) * pi/180);
		
		strD += "M" + fPoint.x + "," + fPoint.y + " Q" + middleCell.xC + "," + middleCell.yC + " ";
		
		x = endCell.xC === middleCell.xC ? endCell.xC : 
			middleCell.xC + stepSize*Math.cos(getAngle(endCell.xC - middleCell.xC, 0) * pi/180);
		y = endCell.yC === middleCell.yC ? endCell.yC : 
			middleCell.yC + stepSize*Math.sin(getAngle(0, endCell.yC - middleCell.yC) * pi/180);	
				
		strD += x + "," + y + " ";
		
		return strD;
	};
	
	var drawPath = function(path)
	{
		var svgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path'),
			endPoint = path[path.length - 1].cell,
			strD = "M" + endPoint.xC + ", " + endPoint.yC + " ",
			stepSize = getStepSize(),
			point, nextPoint, x, y,
			pi = Math.PI,
			cell, middleCell, endCell,
			step, i, len;
		if (isRoundedAngle)
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
		Svg.appendChild(svgPath);	
		SvgObjects.push(svgPath);
		
		for (i = 0, len1 = svgPath.getTotalLength(), step = (len1 / (len1 * ProcentPathFreq/100)); i < len1; i += step)
		{
		
			point = 
			{
				xC: svgPath.getPointAtLength(i).x, 
				yC: svgPath.getPointAtLength(i).y
			};
			PointsTo3DWalk.push(point);
			drawCircle(point, 1);
			
			//вектор взгляда будет направлен на DistanseLooking шагов вперед
			//или на последнюю точку
			nextPoint = 
			{
				xC: svgPath.getPointAtLength(i + DistanseLooking*step).x, 
				yC: svgPath.getPointAtLength(i + DistanseLooking*step).y
			};

			x = nextPoint.xC - point.xC;
			y = point.yC - nextPoint.yC;
			point.angle = getAngle(x, y);					
		}
		if (isShowLooking) showArrows();
	}	
	
	var showArrows = function()
	{
		var i, len1;
		for (i = 1, len1 = PointsTo3DWalk.length; i < len1; i++)
		{
			(function (point) 
			{
				SearchTimeouts.push(setTimeout(function(){ drawArrow(point) }, i*100));
			}
			)(PointsTo3DWalk[i])
			
		}
	}
	
	var drawArrow = function(point)
	{
		var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
			leftSide = document.createElementNS('http://www.w3.org/2000/svg', 'line'),
			RightSide = document.createElementNS('http://www.w3.org/2000/svg', 'line'),
			halfSize = getStepSize()/2,
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
			
		Svg.appendChild(line);	
		SvgObjects.push(line);
		Svg.appendChild(leftSide);	
		Svg.appendChild(RightSide);	
		SvgObjects.push(leftSide);
		SvgObjects.push(RightSide);
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
	
	var showRoute = function (arrOfPoints)
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
		
		drawPath(path);
	}
	
	var fillWayCells = function (cell, minDiffDistWayP) 
	{
		var wayPoint,
			diffDist,
			i, len1;
		
        for (i = 0, len1 = WayPoints.length; i < len1; i++)
		{
			wayPoint = WayPoints[i];
			
			diffDist = Math.round(Math.sqrt(Math.pow(cell.x + getStepSize()/2 - wayPoint.x, 2) + 
				Math.pow(cell.y + getStepSize()/2 - wayPoint.y, 2)));
			
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
				cell = { 
					x: xAbs, 
					y: yAbs, 
					x2: xAbs + StepSize, 
					y2: yAbs + StepSize, 
					xC: Math.round(xAbs + StepSize/2),
					yC: Math.round(yAbs + StepSize/2),
					pointOfMap: pointOfMap
				};
				
				pointOfMap = { xAbs: xAbs, yAbs: yAbs, x: x, y: y, cell: cell };
				TerrainMap[x][y] = pointOfMap;
				
				cell.pointOfMap = pointOfMap;
				
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
			start, end, cell, nextCell, 
			cellMiddle, nextCellMiddle,
			x, y, angle,
			i, len1;
			
		for (i = 0, len1 = routeCells.length; i < len1 - 1; i++)
		{
			start = graph.nodes[routeCells[i].pointOfMap.x][routeCells[i].pointOfMap.y];
			end = graph.nodes[routeCells[i+1].pointOfMap.x][routeCells[i+1].pointOfMap.y];
			Route = Route.concat(astar.search(graph.nodes, start, end, isDiaganalAllow));
		}
		for (i = 0, len1 = Route.length; i < len1; i++)
		{
			cell = Route[i].cell;
		}
		showRoute(Route);
	}
	
	var getAngle = function(x, y)
	{
		if(x==0) return (y>0) ? 90 : 270; 
		var a = Math.atan(y/x)*180/Math.PI; 
		a = (x > 0) ? a+0 : a+180; 
		return a; 
	}
	
	var getStepSize = function()
	{
		if (StepSize) return StepSize;
		
		return Door.beginCoord.x === Door.endCoord.x ? 
			Math.round(Math.abs(Door.beginCoord.y - Door.endCoord.y) * 3/5) : 
			Math.round(Math.abs(Door.beginCoord.x - Door.endCoord.x) * 3/5)
	};
	
	var setStepSize = function(step)
	{
		StepSize = step;
	};
	
	Self.getStepSize = getStepSize;
	Self.setStepSize = setStepSize;
	
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