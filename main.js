function init(year, month, minFlightCount) {
	let width = window.innerWidth;
	let height = window.innerHeight;

	let projection = d3.geoAlbers()
		.translate([width/2, height/1.8])
		.scale([1300]);

	let radius = d3.scaleSqrt()
	    .domain([0, 100])
	    .range([0, 14])

	let voronoi = d3.voronoi()
		.extent([[-1, -1], [width + 1, height + 1]]);

	let path = d3.geoPath()
		.projection(projection);

	let svg = d3.select("body").append("svg")
		.attr("width", width)
		.attr("height", height);

	let states = svg.append("svg:g")
		.attr("id", "states");

	d3.select("body").style("background-color", "#444");

	let processAirportInfo = a => {
		a[0] = +a.Longitude;
		a[1] = +a.Latitude;
		a.flights = [];
		a.arrivalDelay = 0;
		return a;
	}

	let processArrivalDelay = a => {
		a.delay = +a.Delay;
		return a;
	}

	let processATADelay = a => {
		a.delay = +a.Delay;
		return a;
	}

	d3.json("./data/us.json").then((us) => {
		states.selectAll("path")
			.data(us.features)
			.enter().append("svg:path")
			.attr("d", path)
			.attr("class", "states");
	});

	Promise.all([
		d3.csv('./data/airport_info.csv', processAirportInfo),
		d3.csv(`./data/${year}_${month}_arrival_delay.csv`, processArrivalDelay),
		d3.csv(`./data/${year}_${month}_ata_delay.csv`, processATADelay),
	]).then(([airports, arrivals, atas]) => {
		// console.log(airport);
		// console.log(ata);

		flightCount = [];
		airports.forEach(a => {
			flightCount[a.AirportID] = 0;
		})

		atas.forEach(ata => {
			flightCount[ata.OriginAirportID]++;
			flightCount[ata.DestAirportID]++;
		});

		let airportByID = d3.map(airports, d => d.AirportID);

		arrivals.forEach(ar => {
			let a = airportByID.get(ar.AirportID);
			a.arrivalDelay = ar.delay;
		});

		// console.log(atas);
		atas.forEach(ata => {
			let source = airportByID.get(ata.OriginAirportID);
			let target = airportByID.get(ata.DestAirportID);

			source.flights.push({
				arc: {type: "LineString", coordinates: [source, target]},
				delay: ata.Delay
			});
			target.flights.push({
				arc: {type: "LineString", coordinates: [target, source]},
				delay: ata.Delay
			});
		});

		airports = airports
			.filter(a => flightCount[a.AirportID] > minFlightCount);

		// svg.append("path")
		// 	.datum({type: "MultiPoint", coordinates: airports})
		// 	.attr("class", "airport-dots")
		// 	.attr("d", path);


		let airport = svg.selectAll(".airport")
			.data(airports)
			.enter().append("g")
			.attr("class", "airport")
			.on("mouseover", d => {
				document.getElementById("info").innerHTML =
				`<h3>${d.Name} Airport </h3><br/>
				<h5>Number of flights: ${flightCount[d.AirportID]} flights</h5>
				<h5>Avg arrival delay: <span style="color: ${mapDelayColor(2 * d.arrivalDelay)}"> ${(~~(d.arrivalDelay * 100) / 100)}</span> minutes</h5>`;
			});

		let mapDelayColor = v => {
			return d3.hsl(Math.min(Math.max((- 5 * v + 120), 0), 180), 0.8, 0.6).toString();
		}

		airport
			.append("circle")
			.attr("cx", d => projection(d)[0])
			.attr("cy", d => projection(d)[1])
			.attr("r", d => Math.log2(6 * flightCount[d.AirportID]))
			.attr("class", "airport-dots")
			.attr("fill", d => mapDelayColor(2 * d.arrivalDelay));

		airport
			.append("path")
			.data(voronoi(airports.map(projection)).polygons())
			.attr("class", "airport-cell")
			.attr("d", function(d) { return d ? "M" + d.join("L") + "Z" : null; });

		airport
			.append("g")
			.attr("class", "airport-arcs")
			.selectAll(".airport-arc")
			.data(d => d.flights)
			.enter().append("path")
			.attr("d", d => path(d.arc))
			.style("stroke", d => mapDelayColor(d.delay))
			.attr("class", "airport-arc");
	});

	// let positions = airports_json.map(ap => [+ap.latitude, +ap.longitude]);
	//  		let polygons = voronoi.polygons(positions);
	//  		console.log(polygons);

	d3.select(self.frameElement).style("height", height + "px");

	window.reset = (year, month, minFlightCount) => {
		svg.remove();
		init(year, month, minFlightCount);
	}
}

window.onload = () => {
	init(2017, 1, 0);

	function draw() {
		let year = document.getElementById("year").value;
		let month = document.getElementById("month").value;
		let minFlight = document.getElementById("minFlight").value;
		window.reset(year, month, minFlight);
	}

	document.getElementById("minFlight").oninput = (e) => {
		document.getElementById("sliderValue").innerHTML = e.target.value;
	}
	document.getElementById("year").onchange = (e) => {
		draw();
	};
	document.getElementById("month").onchange = (e) => {
		draw();
	};

	document.getElementById("rebuild").onclick = (e) => {
		draw();
	}
}
