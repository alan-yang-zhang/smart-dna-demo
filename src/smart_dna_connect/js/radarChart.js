function RadarChart(id, data, options) {
	var config = initConfig(id, data, options);

	//If the supplied maxValue is smaller than the actual one, replace by the max in the data
	var maxValue = Math.max(config.maxValue, d3.max(data, function(i){return d3.max(i.map(function(o){return o.value;}))}));

	var allAxis = (data[0].map(function(i, j){return i.axis})),
		total = allAxis.length,					
		radius = Math.min(config.w/4, config.h/4), 	
		Format = d3.format('%'),
		angleSlice = Math.PI * 2 / total;

	var rScale = d3.scaleLinear()
		.range([0, radius])
		.domain([0, maxValue]);

	//Initiate the radar chart SVG
	var svg = d3.select(id).append("svg")
			.attr("width",  config.w + config.margin.left + config.margin.right)
			.attr("height", config.h + config.margin.top + config.margin.bottom)
			.attr("preserveAspectRatio", "xMidYMid meet")
            .attr("class", "radar"+id)
			.attr("viewBox", "0 0 640 640")

	renderTitle(id, config.title, config.w/2 + config.margin.left);

	//Append a g element		
    var g = svg.append("g")
            .attr('class', 'svgWrapper')
			.attr("transform", "translate(" + (config.w/2 + config.margin.left) + "," + (config.h/2 + config.margin.top) + ")");

	//Filter for the outside glow
	var filter = g.append('defs').append('filter').attr('id','glow'),
		feGaussianBlur = filter.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur'),
		feMerge = filter.append('feMerge'),
		feMergeNode_1 = feMerge.append('feMergeNode').attr('in','coloredBlur'),
		feMergeNode_2 = feMerge.append('feMergeNode').attr('in','SourceGraphic');

	//Wrapper for the grid & axes
	var axisGrid = g.append("g").attr("class", "axisWrapper");
	
	//Draw the background circles
	axisGrid.selectAll(".levels")
	   .data(d3.range(1,(config.levels+1)).reverse())
	   .enter()
		.append("circle")
		.attr("class", "gridCircle")
		.attr("r", function(d, i){return radius/config.levels*d;})
        .style("fill", "#FFF")
        .style("stroke-width", (d, i) => {
            if (i === 0) {
                return '7'
            } else {
                return "1"
            }
        })
        .style("stroke", "#DCDCDC")
        
		.style("fill-opacity", config.opacityCircles)
		.style("filter" , "url(#glow)");


	//Create the straight lines radiating outward from the center
	var axis = axisGrid.selectAll(".axis")
		.data(allAxis)
		.enter()
		.append("g")
        .attr("class", "axis");

	//Append the lines
	axis.append("line")
		.attr("x1", function(d, i){ return rScale(0.1) * Math.cos(angleSlice*i  ); })
		.attr("y1", function(d, i){ return rScale(0.1) * Math.sin(angleSlice*i  ); })
		.attr("x2", function(d, i){ return rScale(maxValue*1.1) * Math.cos(angleSlice*i  ); })
		.attr("y2", function(d, i){ return rScale(maxValue*1.1) * Math.sin(angleSlice*i  ); })
		.attr("class", "line")
		.style("stroke", "#B0C4DE")
		.style("stroke-width", "2px");

    const textGroups = axis.append("g")
        .attr("class", "text-group")
		.attr("transform", (d,i) =>  computeTextTransform(d, i))
		.on("click", function(d,i) {
			updateCategory(d);
		})


    textGroups.append('image')
        .attr('class', 'line-image')
		.attr('xlink:href', (d,i) => config.textLabelIcon[i])
		.attr('x', (data,i) => computeTextX(data,i, -10, -20))
        .attr('y', -23)
        .attr('height', '48')
        .attr('width', '48');

	//Append the labels at each axis
	textGroups.append("text")
		.attr("class", "line-text")
        .attr('text-anchor', (data,i) => computeTextAnchor(data,i))
        .attr('x', (data,i) => computeTextX(data,i, 50, -15))
        .attr("dy", "0.35em")
		.text(function(d){return d})
		.call(wrap, config.wrapWidth);

    function computeTextTransform(data, i){
        let x = rScale(maxValue * config.labelFactor) * Math.cos(angleSlice*i);
        let y = rScale(maxValue * config.labelFactor) * Math.sin(angleSlice*i);

        return "translate(" + x + "," + y + ")"; 
    }

    function computeTextX(data, i, paddingRight, paddingLeft){
        const angle = i * 360 / total;

        if ( angle < 90 || angle > 270){
            return paddingRight;
        }else{
            return paddingLeft
        }
    }

    function computeTextAnchor(data, i){
        const angle = i * 360 / total;

        if ( angle < 90 || angle > 270){
            return 'start';
        }else{
            return 'end'
        }
    }

	//The radial line function
	var radarLine = d3.radialLine()
		.radius(function(d) { return rScale(d.value); })
        .angle(function(d,i) {	return (i*angleSlice + Math.PI/2); })
        .curve(d3.curveLinearClosed);
		
	//Create a wrapper for the blobs	
	var blobWrapper = g.selectAll(".radarWrapper")
		.data(data)
		.enter().append("g")
		.attr("class", "radarWrapper");

	//Create the outlines	
	blobWrapper.append("path")
		.attr("class", "radarStroke")
		.attr("d", function(d,i) { return radarLine(d); })
		.style("stroke-width", config.strokeWidth + "px")
		.style("stroke", function(d,i) { return config.labelColor[i]; })
		.style("fill", "none")
		.style("filter" , "url(#glow)");		

	var combined = "";

	blobWrapper.selectAll(".radarStroke")
		.each(function() {
			combined += d3.select(this).attr("d");
		});

	g.append("path")
		.attr("class", "radarArea")
		.attr("d", combined)
		.style("stroke", "none")
		.attr("fill", "#F6CFD9")
		.attr("fill-rule", "evenodd")
		.style("fill-opacity", config.opacityArea)

    renderFooter()

    function renderFooter() { 
        const footerLabel = d3.select(id).select("svg").append('g')
            .attr('id', 'footerLabel')
			.attr("transform", "translate(" + (config.w/2) + "," + (config.h - 20) + ")");

        const footerLabelItem = footerLabel.append('g').attr('transform', 'translate(-180,0)');

        footerLabelItem.append('circle')
            .attr('cx', -20)
            .attr('cy',-7)
            .attr('r', 10)
            .attr('fill', config.labelColor[0])

        footerLabelItem.append('text').classed('foot-title', true)
            .text('your total coverage')
            .attr('fill', config.textColor)

        const footerLabelItem2 = footerLabel.append('g').attr('transform', 'translate(100,0)');

        footerLabelItem2.append('circle')
            .attr('cx', -20)
            .attr('cy',-7)
            .attr('r', 10)
            .attr('fill', config.labelColor[1])

        footerLabelItem2.append('text').classed('foot-title', true)
            .text('people like you at aia')
            .attr('fill', config.textColor)
    }

}

function PieChart(id, data, options) {
	var config = initConfig(id, data, options);

	//Initiate the radar chart SVG
	var svg = d3.select(id).append("svg")
		.attr("width",  config.w + config.margin.left + config.margin.right)
		.attr("height", config.h + config.margin.top + config.margin.bottom)
		.attr("preserveAspectRatio", "xMidYMid meet")
		.attr("class", "radar" + id)
		.attr("viewBox", "0 0 640 320")

	renderTitle(id, config.title, config.w/2 + config.margin.left);

	const svgWrapper = svg.append("g")
		.attr('class', 'svgWrapper')
		.attr("transform", "translate(" + (config.w/2 + config.margin.left) + "," + (config.h/2 + config.margin.top) + ")");

	data.forEach((item, index) => {
		let positionX = -160;

		if (index > 0) {
			positionX = 140;
		}

		const circleGroupItem = svgWrapper.append('g').attr('transform', 'translate('+ positionX+ ', 0)');

		circleGroupItem.append('circle')
			.attr('cx', 0)
			.attr('cy', 0)
			.attr('r', 110)
			.attr('fill', config.labelColor[index])
	
		const circleLabelItem = circleGroupItem.append("g");

		circleLabelItem.append('image')
			.attr('class', 'line-image')
			.attr('xlink:href', config.labelIcon[index])
			.attr('x', -30)
			.attr('y', -40)
			.attr('height', '60')
			.attr('width', '60')
			.attr('fill', '#FFFFFF')


		circleLabelItem.append('text').classed('circleLabel', true)
			.text(item.labeltext)
			.attr('y', 60)
			.attr('fill', '#FFFFFF')
			.attr('text-anchor', 'middle')

		circleGroupItem.append('text').classed('circle-foot-title', true)
			.text(item.footTitle)
			.attr('fill', config.textColor)
			.attr('y', 150)
			.attr('text-anchor', 'middle')
	});

}

function LineChart(id, data, options) {
	var config = initConfig(id, data, options);

	//Initiate the radar chart SVG
	var svg = d3.select(id).append("svg")
		.attr("width",  config.w + config.margin.left + config.margin.right)
		.attr("height", config.h + config.margin.top + config.margin.bottom)
		.attr("preserveAspectRatio", "xMidYMid meet")
		.attr("class", "radar" + id)
		.attr("viewBox", "0 0 640 320")

	let Xdatas = data.map(function(d) {return d.value}),
		Ydatas = data.map(function(d) {return d.key});

	let width = config.w - 10, height = (config.h / 4) -10;

	const xScale = d3.scaleLinear().domain([0, d3.max(Xdatas)]).rangeRound([0, width]);
	const yScale = d3.scaleBand().domain(Ydatas).rangeRound([0, height]);

	const startX = xScale(xScale.domain()[0]);

	let padding = {left: 50, top: 50, right: 50, bottom: 50};

	let g = svg.append('g').attr('transform', 'translate(' + padding.left + ', 120)');

	renderTitle(id, config.title, config.w/2 + config.margin.left);

	renderLeftIconGroup();

	renderLineChart();

	renderFooter()

	function renderLeftIconGroup () {
		const leftIconGroup = g.append('g');
		const leftIconGroupY = height;
		const leftIconGroupX =  startX + 3;
	
		leftIconGroup.append("line")
			.attr("x1", leftIconGroupX)
			.attr("y1", leftIconGroupX - 10)
			.attr("x2", leftIconGroupX)
			.attr("y2", leftIconGroupY)
			.attr("stroke", "black")
			.attr("stroke-width", "2px");
	
		leftIconGroup.append('image')
			.attr('class', 'life-icon-image')
			.attr('xlink:href', config.labelIcon)
			.attr('x', -60)
			.attr('y', 0)
			.attr('height', '60')
			.attr('width', '60')
			.attr('fill', '#FFFFFF')
	}

	function renderLineChart() {
		chart = g.selectAll('.bar').data(data).enter().append('g');

		chart.append("path")
			.attr('fill', function(d, i) {
				return config.labelFullColor[i];
			})
			.attr("d", function(d) {
			return rightRoundedRect(
				startX + 5,
				yScale(d.key),
				width -20,
				yScale.bandwidth() - 10,
				(yScale.bandwidth() -10)  /2);
			});


		chart.append("path")
			.attr('fill', function(d, i) {
				return config.labelColor[i];
			})
			.attr("d", function(d) {
			return rightRoundedRect(
				startX + 5,
				yScale(d.key),
				xScale(d.value) -20,
				yScale.bandwidth() - 10,
				(yScale.bandwidth() -10)  /2);
			});

		chart.append('text')
			.classed('foot-title', true)
			.attr('fill', config.textColor)
			.attr('y', (d, i) => computeTextY(d, i))
			.attr('x', function(d) {
				return startX;
			})
			.attr('dx', function(d) {
				return xScale(d.value) - 30;
			})
			.text(function(d) {return "USD " + d.value})
			.attr('text-anchor', (d, i)=> computeTextAnchor(d, i))

		const topLine = 0;
		const topLineY = yScale(data[topLine].key) - 10;
		const topLineX =  xScale(data[topLine].value) -20;

		chart.filter((d, i) => i === topLine)
			.append('path')
			.attr('fill', config.labelColor[0])
			.attr("d", bottomTriangle(topLineX, topLineY, 10));

		chart.filter((d, i) => i === 1)
			.append('text')
			.attr('text-anchor', 'middle')
			.classed('foot-title', true)
			.attr('fill', config.textColor)
			.attr('y', 90)
			.attr('x', startX + 4)
			.text("0")
	}

    function renderFooter() { 
        const footerLabel = d3.select(id).select("svg").append('g')
            .attr('id', 'footerLabel')
			.attr("transform", "translate(" + (config.w/2 - 90) + "," + (config.h - 30) + ")");

		footerLabelItems = footerLabel.selectAll('.footerLabelItem').data(data).enter().append('g');

		footerLabelItems.attr('transform', (d, i) => computeTextTransform(i));

		footerLabelItems.append('circle')
            .attr('cx', -20)
            .attr('cy',-7)
            .attr('r', 10)
			.attr('fill', function(d, i) {
				return config.labelColor[i];
			})

		footerLabelItems.append('text').classed('foot-title', true)
            .text((d, i) => d.footTitle)
		    .attr('fill', config.textColor)

	}

	function computeTextTransform(i){
        let x = 0;
        let y = (i) * 40;

        return "translate(" + x + "," + y + ")"; 
	}
	
	function computeTextY(d, i){
        if ( i === 0 ) {
            return -30;
        }else{
            return 90;
        }
	}

	function computeTextAnchor(data, i){
        if ( i === 0 ) {
            return 'middle';
        }else{
            return 'end'
        }
    }
}

// Returns path data for a rectangle with rounded right corners.
// Note: it’s probably easier to use a <rect> element with rx and ry attributes!
// The top-left corner is ⟨x,y⟩.
function rightRoundedRect(x, y, width, height, radius) {
	return "M" + x + "," + y
		 + "h" + (width - radius)
		 + "a" + radius + "," + radius + " 0 0 1 " + radius + "," + radius
		 + "v" + (height - 2 * radius)
		 + "a" + radius + "," + radius + " 0 0 1 " + -radius + "," + radius
		 + "h" + (radius - width)
		 + "z";
}

function bottomTriangle(x, y, r) {
	return "M" + x + " " + (y + r)
		 + "L" + (x + r) + " " + (y - r)
		 + "L" + (x - r) + " " + (y - r)
		 + "z";
}

function initConfig(id, data, options) {
	var config = {
        w: 600,				//Width of the circle
        h: 600,				//Height of the circle
        margin: {top: 20, right: 20, bottom: 20, left: 20}, //The margins of the SVG
        levels: 3,				//How many levels or inner circles should there be drawn
        maxValue: 10, 			//What is the value that the biggest circle will represent
        labelFactor: 1.25, 	//How much farther than the radius of the outer circle should the labels be placed
        wrapWidth: 200, 		//The number of pixels after which a label needs to be given a new line
        opacityArea: 0.35, 	//The opacity of the area of the blob
        dotRadius: 1, 			//The size of the colored circles of each blog
        opacityCircles: 0.1, 	//The opacity of the circles of each blob
        strokeWidth: 3, 		//The width of the stroke around each blob
        roundStrokes: false,	//If true the area and stroke will follow a round path (cardinal-closed)
		color: d3.scaleOrdinal(d3.schemeCategory10), //Color function
		textColor: '#242424'
	};
	
	//Put all of the options into a variable called config
	if('undefined' !== typeof options){
	  for(var i in options){
		if('undefined' !== typeof options[i]){ config[i] = options[i]; }
	  }
	}

	d3.select(id).select("svg").remove();

	return config;
}

function wrap(text, width) {
	text.each(function() {
	  var text = d3.select(this),
		  words = text.text().split(/\s+/).reverse(),
		  word,
		  line = [],
		  lineNumber = 0,
		  lineHeight = 1.4, // ems
		  y = text.attr("y"),
		  x = text.attr("x"),
		  dy = parseFloat(text.attr("dy")),
		  tspan = text.text(null).append("tspan").attr("x", x).attr("y", y).attr("dy", dy + "em");
		  
	  while (word = words.pop()) {
		line.push(word);
		tspan.text(line.join(" "));
		if (tspan.node().getComputedTextLength() > width) {
		  line.pop();
		  tspan.text(line.join(" "));
		  line = [word];
		  tspan = text.append("tspan").attr("x", x).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
		}
	  }
	});
}

function renderTitle(id, title, positionX) {
	d3.select(id).select("svg").append('text')
		.classed('title', true)
		.attr('x', positionX)
		.attr('y', 50)
		.text(title)
		.attr('fill', '#242424')
		.attr('text-anchor', 'middle')
}