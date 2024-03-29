<script lang="ts">
	import { onMount } from 'svelte';
	import mapboxgl from 'mapbox-gl';

	let layerCoordinates = [];
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
			markers.forEach((marker) => {
				layerCoordinates.push(mapboxgl.MercatorCoordinate.fromLngLat(marker.getLngLat()));
			});
			// create and initialize a WebGLBuffer to store vertex and color data
			this.buffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				new Float32Array(layerCoordinates.flatMap((el) => [el.x, el.y])),
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
	function removeMarker() {
		//TODO show a confirm alert if they want to remove a fixed marker
		if (!markers[currentMarker].isDraggable()) {
			alert("You can't delete pinned markers");
			return false;
		}
		markers[currentMarker].remove();
		markers.splice(currentMarker, 1);
		markers.forEach((marker, index) => marker.getPopup().setText((index + 1).toString()));
	}
	function setPin() {
		markers[currentMarker].setDraggable(false);
	}
	function unpin() {
		const pinnedMarkers = markers.filter((marker) => !marker.isDraggable());
		if (pinnedMarkers.length > 0) {
			pinnedMarkers.pop().setDraggable(true);
		} else {
			alert("There's no pinned marker");
		}
	}
	//NOTE The problem with layers is that they use the Web Graphics Library which in turn requires also special hardware specification in devices
	function addLayer() {
		map.addLayer(highlightLayer);
	}
	function removeLayer() {
		layerCoordinates = [];
		map.removeLayer(highlightLayer.id);
	}
</script>

<section>
	<h1>Mapbox</h1>
	<button class="marker" on:click={addMarker}>Add marker</button>
	<button class="marker" on:click={removeMarker}>Remove marker</button>
	<button class="pin" on:click={setPin}>Set pin</button>
	<button class="pin" on:click={unpin}>Unpin last marker</button>
	<button class="layer" on:click={addLayer}>Add layer</button>
	<button class="layer" on:click={removeLayer}>Remove layer</button>
	<button class="toggle" on:click={() => (markersIntuitive = !markersIntuitive)}
		>Toggle markers behaviour</button
	>
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
	.marker {
		background-color: rgb(22, 165, 22);
	}
	.pin {
		background-color: rgb(187, 187, 48);
	}
	.layer {
		background-color: rgb(230, 109, 129);
	}
	.toggle {
		background-color: rgb(149, 102, 194);
	}
</style>
