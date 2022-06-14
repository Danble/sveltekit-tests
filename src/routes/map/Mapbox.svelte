<script lang="ts">
	import { onMount } from 'svelte';
	import _ from 'lodash';
	import mapboxgl from 'mapbox-gl';

	let layerCoordinates = [];
	let markerId: number;
	let markersIntuitive = true;
	const markersConfig = { color: '#0d8529', scale: 1.2, draggable: true };

	// create a custom style layer to implement the WebGL content
	const highlightLayer = {
		id: 'highlight',
		type: 'custom',

		// method called when the layer is added to the map
		// https://docs.mapbox.com/mapbox-gl-js/api/#styleimageinterface#onadd
		// I don't understand 100% this part
		onAdd: function (_map, gl) {
			// create GLSL source for vertex shader
			const vertexSource = `
                uniform mat4 u_matrix;
                attribute vec2 a_pos;
                void main() {
                    gl_Position = u_matrix * vec4(a_pos, 0.0, 1.0);
                }`;

			// create GLSL source for fragment shader
			const fragmentSource = `
                void main() {
                    gl_FragColor = vec4(0.1, 0.86, 0.4, 0.9);
                }`;

			// create a vertex shader
			const vertexShader = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vertexShader, vertexSource);
			gl.compileShader(vertexShader);

			// create a fragment shader
			const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(fragmentShader, fragmentSource);
			gl.compileShader(fragmentShader);

			// link the two shaders into a WebGL program
			this.program = gl.createProgram();
			gl.attachShader(this.program, vertexShader);
			gl.attachShader(this.program, fragmentShader);
			gl.linkProgram(this.program);

			this.aPos = gl.getAttribLocation(this.program, 'a_pos');
			// End

			// define vertices of the triangle to be rendered in the custom style layer
			/* const helsinki = mapboxgl.MercatorCoordinate.fromLngLat({
				lng: 25.004,
				lat: 60.239
			});
			const berlin = mapboxgl.MercatorCoordinate.fromLngLat({
				lng: 13.403,
				lat: 52.562
			});
			const kyiv = mapboxgl.MercatorCoordinate.fromLngLat({
				lng: 30.498,
				lat: 50.541
			}); */
			markers.forEach((marker) => {
				layerCoordinates.push(mapboxgl.MercatorCoordinate.fromLngLat(marker.getLngLat()));
			});

			/* console.log(markers.map((marker) => [marker._pos.x, marker._pos.y]).flat());
			let tempMarkers = markers;
			markers.forEach((marker) => marker.remove());
			markers = []; */
			// create and initialize a WebGLBuffer to store vertex and color data
			this.buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				// Should be better we initialized the srcData later for our purposes?
				//new Float32Array([helsinki.x, helsinki.y, berlin.x, berlin.y, kyiv.x, kyiv.y]),
				new Float32Array(layerCoordinates.map((el) => [el.x, el.y]).flat()),
				gl.STATIC_DRAW
			);
		},

		// method fired on each animation frame
		// https://docs.mapbox.com/mapbox-gl-js/api/#map.event:render
		render: function (gl, matrix) {
			gl.useProgram(this.program);
			gl.uniformMatrix4fv(gl.getUniformLocation(this.program, 'u_matrix'), false, matrix);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
			gl.enableVertexAttribArray(this.aPos);
			gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			if (markersIntuitive) {
				gl.drawArrays(gl.TRIANGLE_FAN, 0, markers.length);
			} else {
				gl.drawArrays(gl.TRIANGLE_STRIP, 0, markers.length);
			}
		}
	};

	let center_layer: number[] = [];
	let markers: mapboxgl.marker[] = [];
	let currentMarker: number;
	let container: HTMLElement;
	let map: mapboxgl.Map;
	let mapbox: typeof import('mapbox-gl');
	onMount(async () => {
		const mapboxModule = await import('mapbox-gl');
		mapbox = mapboxModule.default;
		mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY as string;

		const link = document.createElement('link');
		link.rel = 'stylesheet';
		link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.8.2/mapbox-gl.css';

		link.onload = () => {
			const tempMap = new mapbox.Map({
				container,
				style: 'mapbox://styles/mapbox/satellite-v9', // style URL
				center: [-94.5, 88], // starting position [lng, lat]
				zoom: 3 // starting zoom
			});
			tempMap.addControl(new mapbox.NavigationControl({ showCompass: false }), 'bottom-right');
			// el.addControl(new mapbox.GeolocateControl(), "bottom-right");

			// el.on("dragend", () => dispatch("recentre", { center: el.getCenter() }));

			tempMap.on('load', () => {
				map = tempMap;
			});
		};

		document.head.appendChild(link);
	});

	function addMarker() {
		const marker = new mapboxgl.Marker(markersConfig).setLngLat([-19.07, 9]).addTo(map);
		//TODO make a conditional that prevents to add a new one if it is in the exact same coordinates and is not draggable
		markers.push(marker);

		const popup = new mapboxgl.Popup({ closeOnClick: false })
			.setLngLat(marker.getLngLat())
			.setText(markers.length.toString())
			.addTo(map);
		marker.setPopup(popup);

		map.flyTo({
			center: [0, 0]
		});
		marker.on('dragend', () => {
			currentMarker = parseInt(marker.getPopup()._container.innerText.replace('\nx', '')) - 1;
			console.log(marker.getPopup());
		});
		console.log('marker created', markers);
	}
	function setPin() {
		//TODO make setpin dinamic
		markers[markers.length - 1].setDraggable(false);
	}
	function removeMarker() {
		//TODO show a confirm alert if they want to remove a fixed marker
		markers[currentMarker].remove();
		markers.splice(currentMarker, 1);
		markers.forEach((marker, index) => marker.getPopup().setText((index + 1).toString()));
	}
	//NOTE The problem with layers is that they use the Web Graphics Library which in turn requires also special hardware specification in devices
	function addLayer() {
		map.addLayer(highlightLayer);
		/* map.flyTo({
			center: center_layer
		}); */
		center_layer = [];
	}
	function removeLayer() {
		layerCoordinates = [];
		map.removeLayer(highlightLayer.id);
	}
</script>

<section>
	<h1>Mapbox</h1>
	<button on:click={addMarker}>Add marker</button>
	<button on:click={setPin}>Set pin</button>
	<button on:click={removeMarker}>Remove marker</button>
	<button on:click={addLayer}>Add layer</button>
	<button on:click={removeLayer}>Remove layer</button>
	<button on:click={() => (markersIntuitive = !markersIntuitive)}>Toggle markers behaviour</button>
</section>
<div class="relative flex-1 full-height" bind:this={container}>{map}</div>

<style>
	section {
		display: flex;
		justify-content: space-between;
		margin: 0.21rem;
	}
	.full-height {
		height: 86vh;
	}
</style>
