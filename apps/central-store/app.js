/* central-store UI — Apps Script Index.html থেকে (tools/build-app.ps1) */
if(!window.SCS_GAS_HOST){(function(){var k='scs_reload_central-store';try{if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');location.replace(location.pathname+'?r='+Date.now()+location.hash);return}}catch(e){}alert('This page is outdated: please upload the new apps/central-store/index.html to the site, then reload.\nপেজটা পুরনো: সাইটে নতুন apps/central-store/index.html আপলোড করে রিলোড করুন।')})();throw new Error('SCS: outdated index.html')}
try{sessionStorage.removeItem('scs_reload_central-store')}catch(e){}
(function () {
'use strict';
var ICONS = {"arrow-right":"<path d=\"M5 12h14\"/><path d=\"m12 5 7 7-7 7\"/>","calendar":"<path d=\"M8 2v4\"/><path d=\"M16 2v4\"/><rect width=\"18\" height=\"18\" x=\"3\" y=\"4\" rx=\"2\"/><path d=\"M3 10h18\"/>","chevron-down":"<path d=\"m6 9 6 6 6-6\"/>","chevron-left":"<path d=\"m15 18-6-6 6-6\"/>","chevron-right":"<path d=\"m9 18 6-6-6-6\"/>","circle-alert":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\"/><line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\"/>","circle-check":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"m9 12 2 2 4-4\"/>","database":"<ellipse cx=\"12\" cy=\"5\" rx=\"9\" ry=\"3\"/><path d=\"M3 5V19A9 3 0 0 0 21 19V5\"/><path d=\"M3 12A9 3 0 0 0 21 12\"/>","download":"<path d=\"M12 15V3\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><path d=\"m7 10 5 5 5-5\"/>","globe":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20\"/><path d=\"M2 12h20\"/>","info":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><path d=\"M12 16v-4\"/><path d=\"M12 8h.01\"/>","layout-dashboard":"<rect width=\"7\" height=\"9\" x=\"3\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"14\" y=\"3\" rx=\"1\"/><rect width=\"7\" height=\"9\" x=\"14\" y=\"12\" rx=\"1\"/><rect width=\"7\" height=\"5\" x=\"3\" y=\"16\" rx=\"1\"/>","lock":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/>","lock-open":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 9.9-1\"/>","log-out":"<path d=\"m16 17 5-5-5-5\"/><path d=\"M21 12H9\"/><path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4\"/>","moon":"<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\"/>","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2\"/><path d=\"M12 20v2\"/><path d=\"m4.93 4.93 1.41 1.41\"/><path d=\"m17.66 17.66 1.41 1.41\"/><path d=\"M2 12h2\"/><path d=\"M20 12h2\"/><path d=\"m6.34 17.66-1.41 1.41\"/><path d=\"m19.07 4.93-1.41 1.41\"/>","package":"<path d=\"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z\"/><path d=\"M12 22V12\"/><polyline points=\"3.29 7 12 12 20.71 7\"/><path d=\"m7.5 4.27 9 5.15\"/>","pen-line":"<path d=\"M13 21h8\"/><path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/>","printer":"<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\"/><path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\"/><rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\"/>","refresh-cw":"<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\"/><path d=\"M21 3v5h-5\"/><path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\"/><path d=\"M8 16H3v5\"/>","rotate-ccw":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/>","save":"<path d=\"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z\"/><path d=\"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7\"/><path d=\"M7 3v4a1 1 0 0 0 1 1h7\"/>","search":"<path d=\"m21 21-4.34-4.34\"/><circle cx=\"11\" cy=\"11\" r=\"8\"/>","settings":"<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>","shield-check":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"m9 12 2 2 4-4\"/>","shield-alert":"<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"/><path d=\"M12 8v4\"/><path d=\"M12 16h.01\"/>","trash-2":"<path d=\"M10 11v6\"/><path d=\"M14 11v6\"/><path d=\"M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6\"/><path d=\"M3 6h18\"/><path d=\"M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2\"/>","trending-up":"<path d=\"M16 7h6v6\"/><path d=\"m22 7-8.5 8.5-5-5L2 17\"/>","triangle-alert":"<path d=\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\"/><path d=\"M12 9v4\"/><path d=\"M12 17h.01\"/>","upload":"<path d=\"M12 3v12\"/><path d=\"m17 8-5-5-5 5\"/><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/>","x":"<path d=\"M18 6 6 18\"/><path d=\"m6 6 12 12\"/>","layers":"<path d=\"M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z\"/><path d=\"M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12\"/><path d=\"M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17\"/>","file-spreadsheet":"<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M8 13h2\"/><path d=\"M14 13h2\"/><path d=\"M8 17h2\"/><path d=\"M14 17h2\"/>","sliders-horizontal":"<path d=\"M10 5H3\"/><path d=\"M12 19H3\"/><path d=\"M14 3v4\"/><path d=\"M16 17v4\"/><path d=\"M21 12h-9\"/><path d=\"M21 19h-5\"/><path d=\"M21 5h-7\"/><path d=\"M8 10v4\"/><path d=\"M8 12H3\"/>","delete":"<path d=\"M10 5a2 2 0 0 0-1.344.519l-6.328 5.74a1 1 0 0 0 0 1.481l6.328 5.741A2 2 0 0 0 10 19h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2z\"/><path d=\"m12 9 6 6\"/><path d=\"m18 9-6 6\"/>","check":"<path d=\"M20 6 9 17l-5-5\"/>","square":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"/>","square-check-big":"<path d=\"M21 10.656V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.344\"/><path d=\"m9 11 3 3L22 4\"/>","link":"<path d=\"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71\"/><path d=\"M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71\"/>","arrow-up":"<path d=\"m5 12 7-7 7 7\"/><path d=\"M12 19V5\"/>","arrow-down":"<path d=\"M12 5v14\"/><path d=\"m19 12-7 7-7-7\"/>","file-code":"<path d=\"M10 12.5 8 15l2 2.5\"/><path d=\"m14 12.5 2 2.5-2 2.5\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z\"/>","send":"<path d=\"M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z\"/><path d=\"m21.854 2.147-10.94 10.939\"/>","wallet":"<path d=\"M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1\"/><path d=\"M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4\"/>","truck":"<path d=\"M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2\"/><path d=\"M15 18H9\"/><path d=\"M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14\"/><circle cx=\"17\" cy=\"18\" r=\"2\"/><circle cx=\"7\" cy=\"18\" r=\"2\"/>","receipt":"<path d=\"M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z\"/><path d=\"M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8\"/><path d=\"M12 17.5v-11\"/>","award":"<path d=\"m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526\"/><circle cx=\"12\" cy=\"8\" r=\"6\"/>","chart-column":"<path d=\"M3 3v16a2 2 0 0 0 2 2h16\"/><path d=\"M18 17V9\"/><path d=\"M13 17V5\"/><path d=\"M8 17v-3\"/>","grip-vertical":"<circle cx=\"9\" cy=\"12\" r=\"1\"/><circle cx=\"9\" cy=\"5\" r=\"1\"/><circle cx=\"9\" cy=\"19\" r=\"1\"/><circle cx=\"15\" cy=\"12\" r=\"1\"/><circle cx=\"15\" cy=\"5\" r=\"1\"/><circle cx=\"15\" cy=\"19\" r=\"1\"/>","history":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"/><path d=\"M3 3v5h5\"/><path d=\"M12 7v5l4 2\"/>","users":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><path d=\"M22 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/>","archive-restore":"<rect width=\"20\" height=\"5\" x=\"2\" y=\"3\" rx=\"1\"/><path d=\"M4 8v11a2 2 0 0 0 2 2h2\"/><path d=\"M20 8v11a2 2 0 0 1-2 2h-2\"/><path d=\"m9 15 3-3 3 3\"/><path d=\"M12 12v9\"/>","hard-drive":"<line x1=\"22\" x2=\"2\" y1=\"12\" y2=\"12\"/><path d=\"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z\"/><line x1=\"6\" x2=\"6.01\" y1=\"16\" y2=\"16\"/><line x1=\"10\" x2=\"10.01\" y1=\"16\" y2=\"16\"/>","cloud-upload":"<path d=\"M12 13v8\"/><path d=\"M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242\"/><path d=\"m8 17 4-4 4 4\"/>","plus":"<path d=\"M5 12h14\"/><path d=\"M12 5v14\"/>","pencil":"<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"/><path d=\"m15 5 4 4\"/>","eye":"<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>","filter":"<polygon points=\"22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3\"/>","boxes":"<path d=\"M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z\"/><path d=\"m7 16.5-4.74-2.85\"/><path d=\"m7 16.5 5-3\"/><path d=\"M7 16.5v5.17\"/><path d=\"M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z\"/><path d=\"m17 16.5-5-3\"/><path d=\"m17 16.5 4.74-2.85\"/><path d=\"M17 16.5v5.17\"/><path d=\"M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z\"/><path d=\"M12 8 7.26 5.15\"/><path d=\"m12 8 4.74-2.85\"/><path d=\"M12 13.5V8\"/>","scroll-text":"<path d=\"M15 12h-5\"/><path d=\"M15 8h-5\"/><path d=\"M19 17V5a2 2 0 0 0-2-2H4\"/><path d=\"M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3\"/>","clock":"<circle cx=\"12\" cy=\"12\" r=\"10\"/><polyline points=\"12 6 12 12 16 14\"/>","user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/>","arrow-down-to-line":"<path d=\"M12 17V3\"/><path d=\"m6 11 6 6 6-6\"/><path d=\"M19 21H5\"/>","arrow-up-from-line":"<path d=\"m18 9-6-6-6 6\"/><path d=\"M12 3v14\"/><path d=\"M5 21h14\"/>","package-plus":"<path d=\"M16 16h6\"/><path d=\"M19 13v6\"/><path d=\"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14\"/><path d=\"m7.5 4.27 9 5.15\"/><polyline points=\"3.29 7 12 12 20.71 7\"/><line x1=\"12\" x2=\"12\" y1=\"22\" y2=\"12\"/>","package-minus":"<path d=\"M16 16h6\"/><path d=\"M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14\"/><path d=\"m7.5 4.27 9 5.15\"/><polyline points=\"3.29 7 12 12 20.71 7\"/><line x1=\"12\" x2=\"12\" y1=\"22\" y2=\"12\"/>","file-json":"<path d=\"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z\"/><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"/><path d=\"M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1\"/><path d=\"M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1\"/>","user-plus":"<path d=\"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><line x1=\"19\" x2=\"19\" y1=\"8\" y2=\"14\"/><line x1=\"22\" x2=\"16\" y1=\"11\" y2=\"11\"/>","key-round":"<path d=\"M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z\"/><circle cx=\"16.5\" cy=\"7.5\" r=\".5\" fill=\"currentColor\"/>","chevron-up":"<path d=\"m18 15-6-6-6 6\"/>","list-ordered":"<path d=\"M10 12h11\"/><path d=\"M10 18h11\"/><path d=\"M10 6h11\"/><path d=\"M4 10h2\"/><path d=\"M4 6h1v4\"/><path d=\"M6 18H4c0-1 2-2 2-3s-1-1.5-2-1\"/>","tags":"<path d=\"m15 5 6.3 6.3a2.4 2.4 0 0 1 0 3.4L17 19\"/><path d=\"M9.586 5.586A2 2 0 0 0 8.172 5H3a1 1 0 0 0-1 1v5.172a2 2 0 0 0 .586 1.414L8.29 18.29a2.426 2.426 0 0 0 3.42 0l3.58-3.58a2.426 2.426 0 0 0 0-3.42z\"/><circle cx=\"6.5\" cy=\"9.5\" r=\".5\" fill=\"currentColor\"/>","chevrons-up-down":"<path d=\"m7 15 5 5 5-5\"/><path d=\"m7 9 5-5 5 5\"/>","archive":"<rect width=\"20\" height=\"5\" x=\"2\" y=\"3\" rx=\"1\"/><path d=\"M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8\"/><path d=\"M10 12h4\"/>","store":"<path d=\"m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7\"/><path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\"/><path d=\"M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4\"/><path d=\"M2 7h20\"/><path d=\"M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7\"/>"};
var DEFAULT_LOGO = 'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2064%2064%22%3E%3Crect%20width%3D%2264%22%20height%3D%2264%22%20rx%3D%2214%22%20fill%3D%22white%22%2F%3E%3Ccircle%20cx%3D%2232%22%20cy%3D%2232%22%20r%3D%2226%22%20fill%3D%22none%22%20stroke%3D%22%23e5007d%22%20stroke-width%3D%225%22%2F%3E%3Ctext%20x%3D%2232%22%20y%3D%2238%22%20text-anchor%3D%22middle%22%20font-family%3D%22Arial%2Csans-serif%22%20font-size%3D%2218%22%20font-weight%3D%22700%22%20fill%3D%22%23334155%22%3ESCS%3C%2Ftext%3E%3C%2Fsvg%3E';


/* =====================================================================
 *  SCS CENTRAL STORE — Frontend Core
 *  (UI = SCS Monthly Report App design language: Tailwind classes, pink-600 brand)
 * ===================================================================== */
var LS = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
};

var S = {
  lang: LS.get('scs_store_lang', 'en'),
  theme: LS.get('scs_store_theme', 'light'),
  token: LS.get('scs_store_token', ''),
  pub: null,            // public boot (login screen)
  boot: null,           // bootstrap data after login
  view: LS.get('scs_store_view', 'dashboard'),
  month: '',
  busy: 0,
  pin: '',
  pinBusy: false,
  flash: false,
  adminTab: LS.get('scs_store_admin_tab', 'products'),
  entry: null,
  dash: null, stock: { q: '', filter: 'all', cat: '' },
  hist: null, logs: null, monthly: null, ledger: null,
  admin: {}
};
S.logo = (function () { try { var o = JSON.parse(LS.get('scs_store_logo', '')); return o && typeof o.v === 'string' ? o : null; } catch (e) { return null; } })();
S.adminOn = false; S.userToken = ''; S.userBoot = null; S.lastAct = Date.now();
var CACHE = {};   // answers of read-only calls, keyed by request; valid while the database revision is unchanged

/* ---------- helpers ---------- */
function L(en, bn) { return S.lang === 'bn' ? (bn || en) : en; }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}
function ic(name, cls) {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="' + (cls || 'w-4 h-4') + '">' + (ICONS[name] || '') + '</svg>';
}
function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function val(id) { var el = document.getElementById(id); return el ? el.value : ''; }

function fmtN(n) {
  n = Number(n) || 0;
  var neg = n < 0; n = Math.abs(n);
  var r = Math.round(n * 1000) / 1000;
  var parts = String(r).split('.');
  var x = parts[0];
  if (x.length > 3) x = x.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + x.slice(-3);
  return (neg ? '-' : '') + x + (parts[1] ? '.' + parts[1] : '');
}
var MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var MONTHS_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
var MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtD(d) {
  d = String(d || '');
  if (!/^\d{4}-\d{2}-\d{2}/.test(d)) return d || '-';
  return Number(d.slice(8, 10)) + ' ' + MON3[Number(d.slice(5, 7)) - 1] + ' ' + d.slice(0, 4);
}
function fmtDT(s) { s = String(s || ''); return s ? fmtD(s.slice(0, 10)) + (s.length > 10 ? ' ' + s.slice(11, 16) : '') : '-'; }
function monthLabel(m) { var i = Number(m.slice(5, 7)) - 1; return (S.lang === 'bn' ? MONTHS_BN[i] : MONTHS_EN[i]) + ' ' + m.slice(0, 4); }
function monthUpper(m) { return MONTHS_EN[Number(m.slice(5, 7)) - 1].toUpperCase() + '-' + m.slice(0, 4); }
function localToday() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function today() { return (S.boot && S.boot.today) || localToday(); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
function isAdmin() { return !!(S.boot && S.boot.user && S.boot.user.role === 'ADMIN'); }
function products() { return (S.boot && S.boot.products) || []; }
function productById(id) { return products().filter(function (p) { return p.id === id; })[0] || null; }
function unitLabel(p) { return p ? (p.unit || '') : ''; }
function prodLabel(p) { return p.code + ' - ' + p.name + (p.pack ? ' (' + p.pack + ')' : ''); }

/* ---------- server bridge ---------- */
function api(action, data, opts) {
  opts = opts || {};
  return new Promise(function (resolve, reject) {
    if (!opts.silent) busy(true);
    var fail = function (msg, code) {
      if (!opts.silent) busy(false);
      var e = new Error(msg); e.code = code || '';
      if (code === 'AUTH' && action !== 'login') authLost();
      reject(e);
    };
    try {
      google.script.run
        .withSuccessHandler(function (res) {
          if (!res || !res.ok) return fail(res ? (S.lang === 'bn' ? res.error_bn : res.error) : L('Server error', 'সার্ভার এরর'), res && res.code);
          if (!opts.silent) busy(false);
          resolve(res.data);
        })
        .withFailureHandler(function (err) { fail((err && err.message) || L('Network error — check internet and try again.', 'নেটওয়ার্ক সমস্যা — ইন্টারনেট দেখে আবার চেষ্টা করুন।')); })
        .api({ action: action, data: withLogoV(action, data), token: S.token });
    } catch (e) { fail(L('Apps Script connection unavailable', 'Apps Script সংযোগ নেই')); }
  });
}
/** logo travels only when it changed: the app remembers (logo version → image) in this browser */
function withLogoV(action, data) {
  data = data || {};
  S.lastAct = Date.now();
  if ((action === 'boot' || action === 'bootstrap' || action === 'login' || action === 'adminLogin') && data.logoV === undefined) {
    data = Object.assign({}, data); data.logoV = S.logo ? S.logo.v : '__none__';
  }
  return data;
}
function takeLogo(st) {
  if (!st || st.logo === undefined) return;
  S.logo = { v: String(st.logoV || ''), src: st.logo || '' };
  LS.set('scs_store_logo', JSON.stringify(S.logo));
}
/** read-only calls: show the remembered answer at once; ask the server again only if the database changed since */
function swr(action, data, apply) {
  var key = action + '|' + JSON.stringify(data), hit = CACHE[key];
  if (hit) { apply(hit.data, true); if (hit.rev === S.rev) return Promise.resolve(); }
  var rev0 = S.rev;
  return api(action, data, { silent: true }).then(function (d) {
    var ks = Object.keys(CACHE); if (ks.length > 60) delete CACHE[ks[0]];
    CACHE[key] = { rev: rev0, data: d }; apply(d, false);
  });
}
function failToast(e) { toast(e && e.message ? e.message : String(e), 'error'); }

function authLost() {
  if (S.adminOn && S.userToken) { lockAdmin(false); return; }
  sessionLost();
}
function sessionLost() { if (window.SCS && SCS.reloadApp) { SCS.reloadApp(); return; }
  if (!S.token) return;
  S.adminOn = false; S.userToken = ''; S.userBoot = null; CACHE = {};
  S.token = ''; S.boot = null; LS.del('scs_store_token');
  closeAllModals();
  toast(L('Session expired. Please log in again.', 'সেশন শেষ হয়েছে, আবার লগইন করুন।'), 'error');
  render();
}

function setBoot(b) {
  if (!b) return;
  takeLogo(b.settings);
  S.boot = b;
  S.rev = b.rev;
}

/* ---------- busy overlay ---------- */
function busy(on) {
  S.busy = Math.max(0, S.busy + (on ? 1 : -1));
  var root = document.getElementById('busy-root');
  if (!root) return;
  root.innerHTML = S.busy ? '<div class="fixed inset-0 z-[70] flex items-center justify-center bg-white/40 dark:bg-slate-950/40 backdrop-blur-xs">' +
    '<div class="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl">' +
    '<div class="w-5 h-5 rounded-full border-2 border-pink-200 border-t-pink-600 animate-spin"></div>' +
    '<span class="text-xs font-semibold text-slate-700 dark:text-slate-200">' + L('Processing, please wait...', 'প্রসেস হচ্ছে, অপেক্ষা করুন...') + '</span></div></div>' : '';
}

/* ---------- toast (same as Report App) ---------- */
var toastTimer = null;
function toast(msg, type) {
  type = type || 'info';
  var icon = { success: ic('circle-check', 'w-4 h-4 text-emerald-500'), error: ic('circle-alert', 'w-4 h-4 text-rose-500'), info: ic('info', 'w-4 h-4 text-blue-500') }[type];
  var cls = { success: 'bg-emerald-950/90 border-emerald-700 text-emerald-100', error: 'bg-rose-950/90 border-rose-700 text-rose-100', info: 'bg-slate-900/95 border-slate-700 text-white' }[type];
  var root = document.getElementById('toast-root');
  root.innerHTML = '<div class="fixed bottom-5 right-5 z-[80] scs-slide-up pointer-events-none max-w-[90vw]"><div class="flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border backdrop-blur-md text-xs font-semibold ' + cls + '">' + icon + '<span>' + esc(msg) + '</span></div></div>';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { root.innerHTML = ''; }, type === 'error' ? 5500 : 3500);
}

/* ---------- modals (same look as Report App) ---------- */
var MODALS = [];
function openModal(o) {
  // o = {id, title, sub, body, foot, size, icon, onClose}
  closeModal(o.id, true);
  MODALS.push(o);
  renderModals();
  setTimeout(function () { var f = $('[data-modal="' + o.id + '"] [autofocus]'); if (f) f.focus(); }, 30);
}
function closeModal(id, silent) {
  var m = MODALS.filter(function (x) { return x.id === id; })[0];
  MODALS = MODALS.filter(function (x) { return x.id !== id; });
  if (!silent) { renderModals(); if (m && m.onClose) m.onClose(); }
}
function closeAllModals() { MODALS = []; renderModals(); }
function topModal() { return MODALS[MODALS.length - 1]; }
function renderModals() {
  var root = document.getElementById('modal-root');
  if (!root) return;
  root.innerHTML = MODALS.map(function (o, i) {
    return '<div class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs" data-modal="' + o.id + '" style="z-index:' + (50 + i) + '">' +
      '<div class="w-full ' + (o.size || 'max-w-lg') + ' bg-white dark:bg-slate-900 rounded-2xl p-3 sm:p-4 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col text-slate-900 dark:text-slate-100">' +
      '<div class="flex items-start justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">' +
      '<div class="flex items-center gap-2.5">' + (o.icon ? '<div class="p-2 rounded-xl bg-pink-100 dark:bg-pink-950/70 text-pink-600 shrink-0">' + ic(o.icon, 'w-5 h-5') + '</div>' : '') +
      '<div><h3 class="font-extrabold text-base text-slate-900 dark:text-slate-100">' + o.title + '</h3>' + (o.sub ? '<p class="text-xs text-slate-500 dark:text-slate-400">' + o.sub + '</p>' : '') + '</div></div>' +
      '<button type="button" data-act="modal-close" data-id="' + o.id + '" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">' + ic('x', 'w-4 h-4') + '</button></div>' +
      '<div class="flex-1 overflow-y-auto py-2.5 custom-scrollbar" data-modal-body>' + o.body + '</div>' +
      (o.foot ? '<div class="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">' + o.foot + '</div>' : '') +
      '</div></div>';
  }).join('');
}
function updateModalBody(id, html) {
  var m = MODALS.filter(function (x) { return x.id === id; })[0];
  if (m) m.body = html;
  var b = $('[data-modal="' + id + '"] [data-modal-body]');
  if (b) b.innerHTML = html;
}

/** Confirmation with optional reason / typed confirmation */
function confirmBox(o) {
  // o = {title, message, danger, reason, typeWord, okText, onOk(reason)}
  var id = 'confirm';
  var body = '<div class="space-y-3 text-sm">' +
    '<div class="flex gap-3 items-start p-3 rounded-2xl ' + (o.danger ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200' : 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200') + '">' +
    ic(o.danger ? 'triangle-alert' : 'info', 'w-5 h-5 shrink-0 mt-0.5') + '<div class="text-xs leading-relaxed">' + o.message + '</div></div>' +
    (o.reason ? '<label class="block"><span class="text-xs font-bold text-slate-600 dark:text-slate-300">' + L('Reason (required)', 'কারণ (আবশ্যক)') + '</span>' +
      '<textarea id="cf-reason" rows="2" autofocus class="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-sm" placeholder="' + L('Why?', 'কেন?') + '"></textarea></label>' : '') +
    (o.typeWord ? '<label class="block"><span class="text-xs font-bold text-slate-600 dark:text-slate-300">' + L('Type', 'লিখুন') + ' <code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-rose-600">' + o.typeWord + '</code> ' + L('to confirm', 'নিশ্চিত করতে') + '</span>' +
      '<input id="cf-word" autocomplete="off" ' + (o.reason ? '' : 'autofocus') + ' class="mt-1 w-full p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 font-mono text-sm"></label>' : '') +
    '</div>';
  CONFIRM_CB = o.onOk;
  CONFIRM_OPTS = o;
  openModal({ id: id, title: o.title, icon: o.danger ? 'triangle-alert' : 'info', body: body, size: 'max-w-md',
    foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="confirm"') + btn(o.okText || L('Confirm', 'নিশ্চিত করুন'), 'confirm-ok', o.danger ? 'danger' : 'primary') });
}
var CONFIRM_CB = null, CONFIRM_OPTS = null;

/* ---------- small UI builders ---------- */
function btn(label, act, kind, icon, attrs) {
  var cls = {
    primary: 'bg-pink-600 hover:bg-pink-700 text-white shadow-sm shadow-pink-600/30',
    dark: 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30',
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30',
    ghost: 'text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700',
    outline: 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs',
    soft: 'bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 border border-pink-300 dark:border-pink-800 hover:bg-pink-100'
  }[kind || 'primary'];
  return '<button type="button" data-act="' + act + '" ' + (attrs || '') + ' class="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none ' + cls + '">' + (icon ? ic(icon, 'w-3.5 h-3.5') : '') + '<span>' + label + '</span></button>';
}
var INP = 'w-full px-2.5 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20';
var SEL = 'px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-hidden focus:border-pink-500';
function field(label, inner, cls) {
  return '<label class="block ' + (cls || '') + '"><span class="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-0.5">' + label + '</span>' + inner + '</label>';
}
/** compact search box used in page toolbars */
function searchBox(attr, value, ph, cls) {
  return '<div class="relative ' + (cls || 'flex-1 min-w-40') + '">' + ic('search', 'w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2') +
    '<input type="text" ' + attr + ' value="' + esc(value) + '" placeholder="' + esc(ph) + '" class="' + INP + ' pl-8"></div>';
}
function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(label) + '</option>'; }
function badgeType(t) {
  var m = { IN: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    OUT: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    ADJ: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    DAMAGE: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    REPAIRED: 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800' }[t] || 'bg-slate-100 text-slate-700 border-slate-300';
  return '<span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-black border ' + m + '">' + esc(t === 'ADJ' ? 'OPENING' : t) + '</span>';
}
function chip(text, cls) { return '<span class="text-[11px] px-2 py-0.5 rounded-full font-bold border ' + (cls || 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800') + '">' + text + '</span>'; }
function emptyRow(cols, text) { return '<tr><td colspan="' + cols + '" class="py-8 text-center text-xs text-slate-400 border border-slate-300 dark:border-slate-700">' + (text || L('No records found', 'কোনো রেকর্ড নেই')) + '</td></tr>'; }
function loadingBlock() { return '<div class="py-10 flex items-center justify-center gap-2 text-xs text-slate-400"><div class="w-4 h-4 rounded-full border-2 border-pink-200 border-t-pink-600 animate-spin"></div>' + L('Loading...', 'লোড হচ্ছে...') + '</div>'; }

/* ---------- CSV / download ---------- */
function downloadText(name, text, mime) {
  var blob = new Blob([text], { type: mime || 'text/plain;charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
function downloadCsv(name, headers, rows) {
  var q = function (v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; };
  var csv = [headers.map(q).join(',')].concat(rows.map(function (r) { return r.map(q).join(','); })).join('\r\n');
  downloadText(name + '.csv', '﻿' + csv, 'text/csv;charset=utf-8');
}

/* ---------- date filter (shared by History & Activity Log) ---------- */
function dateFilterUI(prefix, f) {
  var mode = f.dmode || 'all';
  var years = [];
  for (var y = Number(today().slice(0, 4)) + 1; y >= 2023; y--) years.push(y);
  var inner = '';
  if (mode === 'date') inner = '<input type="date" data-ch="' + prefix + '-f" data-k="date" value="' + esc(f.date || '') + '" class="' + SEL + '">';
  else if (mode === 'range') inner = '<input type="date" data-ch="' + prefix + '-f" data-k="from" value="' + esc(f.from || '') + '" class="' + SEL + '"><span class="text-xs text-slate-400">' + L('to', 'থেকে') + '</span><input type="date" data-ch="' + prefix + '-f" data-k="to" value="' + esc(f.to || '') + '" class="' + SEL + '">';
  else if (mode === 'month') inner = '<input type="month" data-ch="' + prefix + '-f" data-k="month" value="' + esc(f.month || today().slice(0, 7)) + '" class="' + SEL + '">';
  else if (mode === 'year') inner = '<select data-ch="' + prefix + '-f" data-k="year" class="' + SEL + '">' + years.map(function (y) { return opt(y, y, f.year || today().slice(0, 4)); }).join('') + '</select>';
  return '<div class="flex flex-wrap items-center gap-1.5"><select data-ch="' + prefix + '-f" data-k="dmode" class="' + SEL + '">' +
    opt('all', L('All dates', 'সব তারিখ'), mode) + opt('date', L('Specific date', 'নির্দিষ্ট তারিখ'), mode) + opt('range', L('Date range', 'তারিখ সীমা'), mode) +
    opt('month', L('Monthly', 'মাসিক'), mode) + opt('year', L('Yearly', 'বাৎসরিক'), mode) + '</select>' + inner + '</div>';
}
function dateFilterParams(f) {
  var p = {};
  if (f.dmode === 'date' && f.date) p.date = f.date;
  if (f.dmode === 'range') { if (f.from) p.from = f.from; if (f.to) p.to = f.to; }
  if (f.dmode === 'month') p.month = f.month || today().slice(0, 7);
  if (f.dmode === 'year') p.year = f.year || today().slice(0, 4);
  return p;
}
function setDateFilter(f, k, v) {
  f[k] = v;
  if (k === 'dmode') { f.date = ''; f.from = ''; f.to = ''; f.month = v === 'month' ? today().slice(0, 7) : ''; f.year = v === 'year' ? today().slice(0, 4) : ''; if (v === 'date') f.date = today(); }
}

/* ---------- period filter: Today / Month / Year / Lifetime (one click) + picker ---------- */
var SELC = 'px-2 py-1 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-100 cursor-pointer focus:outline-hidden focus:border-pink-500';
function yearsList() { var ys = []; for (var y = Number(today().slice(0, 4)); y >= 2023; y--) ys.push(String(y)); return ys; }
var PERIOD_TXN = [['date', 'Today', 'আজ'], ['month', 'This Month', 'এই মাস'], ['year', 'This Year', 'এই বছর'], ['all', 'Lifetime', 'লাইফটাইম']];
var PERIOD_STOCK = [['all', 'Lifetime', 'লাইফটাইম'], ['year', 'Year', 'বছর'], ['month', 'Month', 'মাস'], ['date', 'Date', 'তারিখ']];
function periodBar(prefix, f, items) {
  items = items || PERIOD_TXN;
  var m = f.dmode || 'all';
  var chips = items.map(function (it) {
    var a = m === it[0];
    return '<button type="button" data-act="' + prefix + '-per" data-m="' + it[0] + '" class="px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer transition-all ' +
      (a ? 'bg-pink-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700') + '">' + L(it[1], it[2]) + '</button>';
  }).join('');
  var pick = m === 'date' ? '<input type="date" data-ch="' + prefix + '-pick" data-k="date" max="' + today() + '" value="' + esc(f.date || today()) + '" class="' + SELC + '">'
    : m === 'month' ? '<input type="month" data-ch="' + prefix + '-pick" data-k="month" max="' + today().slice(0, 7) + '" value="' + esc(f.month || today().slice(0, 7)) + '" class="' + SELC + '">'
    : m === 'year' ? '<select data-ch="' + prefix + '-pick" data-k="year" class="' + SELC + '">' + yearsList().map(function (y) { return opt(y, y, f.year || today().slice(0, 4)); }).join('') + '</select>' : '';
  return '<div class="flex flex-wrap items-center gap-1 max-w-full"><div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">' + chips + '</div>' + pick + '</div>';
}
function setPeriod(f, mode) {
  f.dmode = mode; f.from = ''; f.to = '';
  f.date = mode === 'date' ? today() : ''; f.month = mode === 'month' ? today().slice(0, 7) : ''; f.year = mode === 'year' ? today().slice(0, 4) : '';
}
function periodRange(f) {
  if (f.dmode === 'date' && f.date) return { from: f.date, to: f.date };
  if (f.dmode === 'month' && f.month) return { from: f.month + '-01', to: f.month + '-31' };
  if (f.dmode === 'year' && f.year) return { from: f.year + '-01-01', to: f.year + '-12-31' };
  return { from: '', to: '' };
}
function periodText(f) {
  if (f.dmode === 'date' && f.date) return fmtD(f.date);
  if (f.dmode === 'month' && f.month) return monthLabel(f.month);
  if (f.dmode === 'year' && f.year) return f.year;
  return L('Lifetime', 'লাইফটাইম');
}
function periodUpper(f) {
  if (f.dmode === 'date' && f.date) return fmtD(f.date).toUpperCase();
  if (f.dmode === 'month' && f.month) return monthUpper(f.month);
  if (f.dmode === 'year' && f.year) return f.year;
  return 'LIFETIME';
}
/** chip click / picker change → onChange() */
function bindPeriod(prefix, getF, onChange) {
  ACT[prefix + '-per'] = function (el) { setPeriod(getF(), el.getAttribute('data-m')); onChange(); };
  CH[prefix + '-pick'] = function (el) { if (!el.value) return; getF()[el.getAttribute('data-k')] = el.value; onChange(); };
}

function pager(prefix, d) {
  if (!d || d.pages <= 1) return '';
  return '<div class="flex items-center gap-1 text-xs">' +
    '<button type="button" data-act="' + prefix + '-page" data-p="' + (d.page - 1) + '" ' + (d.page <= 1 ? 'disabled' : '') + ' class="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer">' + ic('chevron-left', 'w-3.5 h-3.5') + '</button>' +
    '<span class="font-bold">' + d.page + '/' + d.pages + '</span>' +
    '<button type="button" data-act="' + prefix + '-page" data-p="' + (d.page + 1) + '" ' + (d.page >= d.pages ? 'disabled' : '') + ' class="p-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer">' + ic('chevron-right', 'w-3.5 h-3.5') + '</button></div>';
}
function sizeSel(prefix, size) {
  return '<select data-ch="' + prefix + '-size" class="' + SELC + '">' + [50, 100, 200, 500].map(function (n) { return opt(n, n + ' / ' + L('page', 'পেজ'), size); }).join('') + '</select>';
}

/* ---------- event delegation ---------- */
var ACT = {}, CH = {}, IN = {}, KD = {};
window.__scsStore = { S: S, ACT: ACT, load: function () { if (S.view === 'dashboard') VIEW_LOAD.dashboard(); }, soft: function () { try { softRender(); } catch (e) { render(); } } };
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  var fn = ACT[el.getAttribute('data-act')];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('change', function (e) {
  var el = e.target.closest('[data-ch]');
  if (!el) return;
  var fn = CH[el.getAttribute('data-ch')];
  if (fn) fn(el, e);
});
document.addEventListener('input', function (e) {
  var el = e.target.closest('[data-in]');
  if (!el) return;
  var fn = IN[el.getAttribute('data-in')];
  if (fn) fn(el, e);
});
document.addEventListener('keydown', function (e) {
  var el = e.target.closest && e.target.closest('[data-kd]');
  if (el) { var fn = KD[el.getAttribute('data-kd')]; if (fn) return fn(el, e); }
  if (e.key === 'Escape' && (S.full !== null || document.querySelector('.scs-tbl.scs-full'))) { setFull(null); return; }
  if (e.key === 'Escape' && MODALS.length) { var m = topModal(); if (m && !m.locked) closeModal(m.id); return; }
  if (e.key === 'Escape' && closeMenuPop()) return;
});

/* ---------- table VIEW MODE (full screen, frozen header, Esc / button to exit) ---------- */
S.full = null;   // index of the table (in #main) that is in view mode
function tables() { return $$('#main .scs-tbl'); }
function setFull(wrap) {
  $$('.scs-tbl.scs-full').forEach(function (w) { w.classList.remove('scs-full'); });
  if (wrap) { S.full = tables().indexOf(wrap); wrap.classList.add('scs-full'); var sc = wrap.querySelector('.scs-tbl-scroll'); if (sc) sc.scrollTop = 0; }
  else S.full = null;
  document.documentElement.classList.toggle('scs-noscroll', !!wrap);
}
ACT['tbl-full'] = function (el) { var w = el.closest('.scs-tbl'); setFull(w && !w.classList.contains('scs-full') ? w : null); };
/** after any re-render, keep the same table in view mode */
function reapplyFull() {
  if (S.full === null) return;
  if (S.full < 0) { if (!document.querySelector('.scs-tbl.scs-full')) setFull(null); return; }   // table inside a popup that was closed
  var w = tables()[S.full];
  if (!w) { S.full = null; document.documentElement.classList.remove('scs-noscroll'); return; }
  if (!w.classList.contains('scs-full')) w.classList.add('scs-full');
}
new MutationObserver(function () { if (S.full !== null && !document.querySelector('.scs-tbl.scs-full')) reapplyFull(); })
  .observe(document.body, { childList: true, subtree: true });
// mouse wheel / arrow keys must never change a number field (same as Report App)
document.addEventListener('wheel', function (e) { var t = e.target; if (t && t.tagName === 'INPUT' && t.type === 'number' && document.activeElement === t) t.blur(); }, { passive: true, capture: true });

ACT['modal-close'] = function (el) { closeModal(el.getAttribute('data-id')); };
ACT['confirm-ok'] = function () {
  var o = CONFIRM_OPTS || {};
  var reason = o.reason ? val('cf-reason').trim() : '';
  if (o.reason && !reason) return toast(L('Please write the reason.', 'কারণ লিখুন।'), 'error');
  if (o.typeWord && val('cf-word').trim() !== o.typeWord) return toast(L('Type ', 'লিখুন: ') + o.typeWord, 'error');
  closeModal('confirm', true); renderModals();
  if (CONFIRM_CB) CONFIRM_CB(reason);
};


/* =====================================================================
 *  SHELL: Login, TopBar, NavBar, Router, Admin PIN, Live Sync
 * ===================================================================== */
/* Main menu (one row, no dropdown): Dashboard • Stock IN/OUT • Current Stock • Transaction History • Admin  (Product History = Transaction History → product filter) */
var VIEWS = [
  { id: 'entry', en: 'Stock IN / OUT', bn: 'স্টক ইন / আউট', icon: 'arrow-up-down', color: 'text-pink-600' },
  { id: 'stock', en: 'Materials Stock', bn: 'ম্যাটেরিয়ালস স্টক', icon: 'package', color: 'text-cyan-600' },
  { id: 'eqstock', en: 'Equipment Stock', bn: 'ইকুইপমেন্ট স্টক', icon: 'wrench', color: 'text-indigo-600' },
  { id: 'history', en: 'Transaction History', bn: 'ট্রানজ্যাকশন হিস্টোরি', icon: 'history', color: 'text-indigo-600' },
  { id: 'logs', en: 'Activity Log', bn: 'অ্যাক্টিভিটি লগ', icon: 'settings', color: 'text-slate-600' }
];
ICONS['arrow-up-down'] = ICONS['arrow-up-down'] || '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>';
ICONS['maximize'] = '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" x2="14" y1="3" y2="10"/><line x1="3" x2="10" y1="21" y2="14"/>';
ICONS['minimize'] = '<polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" x2="21" y1="10" y2="3"/><line x1="3" x2="10" y1="21" y2="14"/>';
var VIEW_RENDER = {}, VIEW_LOAD = {};
var BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
function viewNum(i) { var n = String(i + 1); return S.lang === 'bn' ? n.split('').map(function (d) { return BN_DIGITS[+d]; }).join('') : n; }
function viewName(id) {
  var v = VIEWS.filter(function (x) { return x.id === id; })[0];
  return v ? L(v.en, v.bn) : '';
}
function storeName() { return (S.boot && S.boot.settings && S.boot.settings.storeName) || (S.pub && S.pub.storeName) || 'SCS Central Store'; }
function logoUrl() { return (S.logo && S.logo.src) || DEFAULT_LOGO; }
function pinMax() { return Math.max(4, Math.min(8, Number(S.pub && S.pub.pinMax) || 4)); }

/* ---------- RENDER ---------- */
var RENDERING = false;
/** DOM বদলানোর সময় কোনো ইনপুটের change/blur থেকে আবার রেন্ডার হলে সেটি পরে চলবে (re-entrancy guard) */
function guarded(fn) {
  return function () {
    if (RENDERING) { setTimeout(fn, 0); return; }
    RENDERING = true;
    try { fn(); } finally { RENDERING = false; }
  };
}
var render = guarded(renderNow);
function renderNow() {
  document.documentElement.classList.toggle('dark', S.theme === 'dark');
  var root = document.getElementById('root');
  if (!S.token || !S.boot) { root.innerHTML = loginHTML(); return; }
  var dark = S.theme === 'dark';
  root.innerHTML = '<div class="min-h-screen flex flex-col transition-colors duration-200 ' + (dark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-900') + '">' +
    '<div class="no-print">' + topbarHTML() + '</div>' +
    '<div class="no-print">' + navbarHTML() + '</div>' +
    '<main id="main" class="flex-1 w-full px-1.5 sm:px-2.5 lg:px-3 py-2 print:max-w-none print:w-full print:p-0 print:m-0 overflow-x-hidden">' + viewHTML() + '</main>' +
    '<footer class="no-print border-t border-slate-200 dark:border-slate-800 py-1.5 text-center text-[10px] text-slate-400"><div class="w-full px-3 flex flex-col sm:flex-row items-center justify-between gap-0.5">' +
    '<span>© ' + today().slice(0, 4) + ' Swarup Construction Solution (SCS). All Rights Reserved.</span>' +
    '<span class="text-pink-600 dark:text-pink-400 font-semibold">"Honesty is our Business Capital"</span></div></footer></div>';
}
function viewHTML() {
  var f = VIEW_RENDER[S.view] || VIEW_RENDER.dashboard;
  try { return f(); } catch (e) { console.error(e); return '<div class="p-6 text-rose-600 text-sm">' + esc(e.message) + '</div>'; }
}
var renderMain = guarded(function () { var m = document.getElementById('main'); if (m) m.innerHTML = viewHTML(); });
var renderNav = guarded(function () { var n = document.querySelector('#root nav'); if (n) n.outerHTML = navbarHTML(); });

/** page change without rebuilding the whole screen (faster) */
function renderPage() {
  if (document.getElementById('main') && document.querySelector('#root header')) { renderTop(); renderNav(); renderMain(); }
  else render();
}
var renderTop = guarded(function () { var h = document.querySelector('#root header'); if (h) h.outerHTML = topbarHTML(); });
function go(view, opts) {
  if (view === 'ledger') view = 'history';
  if (view === 'admin' && !S.adminOn) return askAdminPin(function () { go('admin'); });
  if (view !== 'admin' && S.adminOn) lockAdmin(true, true);   // leaving Admin locks it again
  if (view === 'monthly') view = 'stock';   // Monthly Stock Report is now inside Current Stock (month filter)
  closeMenuPop();
  if (S.full !== null) setFull(null);
  if (view === 'stock' && S.view !== 'stock') { S.stock.f = { dmode: 'all' }; S.stock.rep = null; }   // Current Stock always opens with Lifetime
  S.view = VIEW_RENDER[view] ? view : 'dashboard';
  LS.set('scs_store_view', S.view);
  renderPage();
  window.scrollTo(0, 0);
  if (VIEW_LOAD[S.view] && !(opts && opts.noload)) VIEW_LOAD[S.view]();
}
/** open Transaction History filtered to ONE product (= Product History), Lifetime */
function openProductHistory(pid) {
  S.hist = null; var h = histState(); h.f.productId = pid; setPeriod(h.f, 'all');
  go('history');
}

/* ---------- LOGIN (same as Report App PinLogin) ---------- */
/* SCS: পিন-লগইন স্ক্রিন বাদ (SCS অ্যাকাউন্টই লগইন) — অ্যাপ খোলার সময় শুধু খোলার স্ক্রিন */
function loginHTML() { return SCS.startHTML(S.loginError); }
function doLogin() {}

/* ---------- TOP BAR (pink, narrow) ---------- */
function topbarHTML() {
  var u = S.boot.user;
  var bi = 'h-7 min-w-7 px-1.5 flex items-center justify-center gap-1 rounded-lg text-xs font-semibold bg-white/15 hover:bg-white/25 active:scale-95 transition-all border border-white/25 cursor-pointer text-white';
  return '<header class="no-print sticky top-0 z-40 w-full bg-pink-600 text-white shadow-md transition-colors duration-200"><div class="w-full px-2 sm:px-3 lg:px-4 h-10 flex items-center justify-between gap-2">' +
    '<div class="flex items-center gap-2 min-w-0"><div class="bg-white text-slate-900 pl-1 pr-2 py-0.5 rounded-lg shadow-xs flex items-center gap-1.5 border border-pink-200 min-w-0">' +
    '<img src="' + esc(logoUrl()) + '" alt="SCS Logo" onerror="this.src=DEFAULT_LOGO" class="w-6 h-6 rounded-full border border-pink-300 shrink-0 bg-white object-contain">' +
    '<span class="font-extrabold text-xs sm:text-sm tracking-tight whitespace-nowrap text-slate-900 font-sans truncate">' + esc(storeName()) + '</span></div>' +
    '<div class="hidden lg:flex flex-col leading-tight"><span class="font-bold text-white text-[11px]">Swarup Construction Solution</span><span class="text-[10px] text-pink-200 italic">"Honesty is our Business Capital"</span></div></div>' +
    '<div class="flex items-center gap-1">' +
    '<span class="hidden md:flex h-7 items-center gap-1 px-2 rounded-lg text-[11px] font-semibold bg-white/10 border border-white/20 text-white" title="' + esc(u.role) + '">' + ic(u.role === 'ADMIN' ? 'shield-check' : 'user', 'w-3.5 h-3.5') + '<span class="max-w-28 truncate">' + esc(u.name) + '</span></span>' +
    '<button type="button" data-act="sync" title="' + L('Sync & Refresh', 'সিঙ্ক ও রিফ্রেশ') + '" class="' + bi + '">' + ic('refresh-cw', 'w-3.5 h-3.5 text-white' + (S.syncing ? ' animate-spin' : '')) + '</button>' +
    '<button type="button" data-act="go" data-v="logs" title="' + L('Activity Log', 'অ্যাক্টিভিটি লগ') + '" class="' + bi + (S.view === 'logs' ? ' bg-white/30' : '') + '">' + ic('settings', 'w-3.5 h-3.5') + '</button>' +
    '<button type="button" data-act="lang" title="' + L('বাংলায় পরিবর্তন করুন', 'Switch to English') + '" class="' + bi + '"><span class="font-bold text-[11px]">' + (S.lang === 'bn' ? 'EN' : 'বাং') + '</span></button>' +
    '<button type="button" data-act="theme" title="' + (S.theme === 'dark' ? 'Light Mode' : 'Dark Mode') + '" class="' + bi + '">' + (S.theme === 'dark' ? ic('sun', 'w-3.5 h-3.5 text-amber-300') : ic('moon', 'w-3.5 h-3.5 text-white')) + '</button>' +
    '<button type="button" data-act="logout" title="' + L('Logout', 'লগআউট') + '" class="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-700/80 hover:bg-rose-800 active:scale-95 transition-all border border-rose-500/40 cursor-pointer text-white">' + ic('log-out', 'w-3.5 h-3.5') + '</button>' +
    '</div></div></header>';
}

/* ---------- MAIN MENU (one compact row) ---------- */
function navbarHTML() {
  var v = S.view;
  var base = 'flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer active:scale-95 ';
  var idle = 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-pink-50 hover:text-pink-600 dark:hover:bg-slate-700';
  var on = 'bg-pink-600 text-white border border-pink-600 shadow-xs';
  var item = function (id, label, icon, color) {
    return '<button type="button" data-act="go" data-v="' + id + '" class="' + base + (v === id ? on : idle) + '"><span class="' + (v === id ? 'text-white' : color) + '">' + ic(icon, 'w-3.5 h-3.5') + '</span><span>' + label + '</span></button>';
  };
  return '<nav class="no-print w-full bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-xs">' +
    '<div id="menu-scroll" class="scs-nav-scroll flex items-center gap-1 px-1.5 sm:px-2.5 lg:px-3 py-1">' +
    item('dashboard', L('Dashboard', 'ড্যাশবোর্ড'), 'layout-dashboard', 'text-slate-500') +
    item('entry', L('Stock IN / OUT', 'স্টক ইন / আউট'), 'arrow-up-down', 'text-pink-600') +
    item('stock', L('Materials Stock', 'ম্যাটেরিয়ালস স্টক'), 'package', 'text-cyan-600') +
    item('eqstock', L('Equipment Stock', 'ইকুইপমেন্ট স্টক'), 'wrench', 'text-indigo-600') +
    item('history', L('Transaction History', 'ট্রানজ্যাকশন হিস্টোরি'), 'history', 'text-indigo-600') +
    '<button type="button" data-act="go" data-v="admin" class="' + base + (v === 'admin' ? 'bg-slate-900 text-white border border-slate-900 dark:bg-white dark:text-slate-900' : idle) + '">' + ic(S.adminOn ? 'lock-open' : 'lock', 'w-3.5 h-3.5 ' + (v === 'admin' ? '' : S.adminOn ? 'text-emerald-600' : 'text-slate-500')) + '<span>' + L('Admin', 'অ্যাডমিন') + '</span></button>' +
    '</div></nav>';
}
function closeMenuPop() { return false; }

ACT['go'] = function (el) { go(el.getAttribute('data-v')); };
ACT['lang'] = function () { S.lang = S.lang === 'bn' ? 'en' : 'bn'; LS.set('scs_store_lang', S.lang); render(); };
ACT['theme'] = function () { S.theme = S.theme === 'dark' ? 'light' : 'dark'; LS.set('scs_store_theme', S.theme); render(); };
ACT['logout'] = function () { if (window.SCS && SCS.signOut) { SCS.signOut(); return; }
  confirmBox({ title: L('Logout', 'লগআউট'), message: L('Do you want to log out?', 'আপনি কি লগআউট করতে চান?'), okText: L('Logout', 'লগআউট'),
    onOk: function () {
      api('logout', {}, { silent: true }).catch(function () {});
      S.adminOn = false; S.userToken = ''; S.userBoot = null; CACHE = {};
      S.token = ''; S.boot = null; LS.del('scs_store_token'); S.entry = null; S.hist = null; S.logs = null; Object.keys(S.admin).forEach(function (k) { delete S.admin[k]; }); closeAllModals(); render();
      loadPub();
    } });
};

/* month picker (Dashboard) */
function monthPickerHTML() {
  var m = S.month || today().slice(0, 7), y = m.slice(0, 4), mo = Number(m.slice(5, 7));
  var years = []; for (var yy = 2023; yy <= Number(today().slice(0, 4)) + 1; yy++) years.push(String(yy));
  if (years.indexOf(y) < 0) years.push(y);
  var nb = 'p-0.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 cursor-pointer';
  return '<div class="flex items-center gap-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.5 rounded-lg shadow-xs">' +
    '<button type="button" data-act="month-step" data-d="-1" title="' + L('Previous Month', 'পূর্ববর্তী মাস') + '" class="' + nb + '">' + ic('chevron-left', 'w-3.5 h-3.5') + '</button>' +
    ic('calendar', 'w-3.5 h-3.5 text-pink-600 shrink-0') +
    '<select data-ch="month-m" class="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden cursor-pointer">' +
    (S.lang === 'bn' ? MONTHS_BN : MONTHS_EN).map(function (n, i) { return '<option value="' + (i + 1) + '" class="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"' + (i + 1 === mo ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select>' +
    '<select data-ch="month-y" class="bg-transparent text-xs font-bold text-pink-600 dark:text-pink-400 focus:outline-hidden cursor-pointer">' +
    years.map(function (yv) { return '<option value="' + yv + '" class="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"' + (yv === y ? ' selected' : '') + '>' + yv + '</option>'; }).join('') + '</select>' +
    '<button type="button" data-act="month-step" data-d="1" title="' + L('Next Month', 'পরবর্তী মাস') + '" class="' + nb + '">' + ic('chevron-right', 'w-3.5 h-3.5') + '</button></div>';
}
function setMonth(m) {
  S.month = m;
  if (S.view === 'dashboard') { renderMain(); VIEW_LOAD.dashboard(); }
}
ACT['month-step'] = function (el) {
  var m = S.month || today().slice(0, 7), y = Number(m.slice(0, 4)), mo = Number(m.slice(5, 7)) + Number(el.getAttribute('data-d'));
  if (mo < 1) { mo = 12; y--; } if (mo > 12) { mo = 1; y++; }
  setMonth(y + '-' + ('0' + mo).slice(-2));
};
CH['month-m'] = function (el) { setMonth((S.month || today()).slice(0, 4) + '-' + ('0' + el.value).slice(-2)); };
CH['month-y'] = function (el) { setMonth(el.value + '-' + (S.month || today()).slice(5, 7)); };

/* ---------- PIN KEYPAD: Admin entry, and the PIN for every edit / delete / restore (checked on the server) ---------- */
var ADMIN_PIN = { pin: '', run: null, done: null, title: '', sub: '', busy: false, shake: false };
/** o = { title, sub, run(pin) → Promise, done(result) } */
function askPin(o) {
  ADMIN_PIN = { pin: '', run: o.run, done: o.done || null, title: o.title, sub: o.sub || '', busy: false, shake: false };
  renderAdminPin();
}
/** a protected action: asks the PIN (Admin PIN inside Admin, User PIN elsewhere), then run(pin) calls the server */
function withPin(run, done, sub) {
  askPin({ title: S.view === 'admin' ? L('Admin PIN', 'অ্যাডমিন পিন') : L('User PIN', 'ইউজার পিন'),
    sub: sub || L('Enter your PIN to continue', 'চালিয়ে যেতে আপনার পিন দিন'), run: run, done: done });
}
function askAdminPin(cb) {
  askPin({ title: L('Admin Security PIN', 'অ্যাডমিন নিরাপত্তা পিন'), sub: L('Enter PIN to access Admin', 'অ্যাডমিন প্যানেলে প্রবেশের জন্য পিন দিন'),
    run: function (pin) { return api('adminLogin', { pin: pin }, { silent: true }); },
    done: function (r) { unlockAdmin(r); if (cb) cb(); } });
}
function unlockAdmin(r) {
  if (!S.adminOn) { S.userToken = S.token; S.userBoot = S.boot; }
  S.adminOn = true; S.lastAct = Date.now();
  S.token = r.token;            // not saved in the browser: a page reload always returns to the normal (locked) session
  CACHE = {}; setBoot(r.boot);
  toast(L('Admin unlocked.', 'অ্যাডমিন খোলা হয়েছে।'), 'success');
}
/** lock Admin again → back to the normal user session. stay = don't navigate (caller is already moving) */
function lockAdmin(quiet, stay) {
  if (!S.adminOn) return;
  S.adminOn = false; S.token = S.userToken || S.token; S.userToken = '';
  var ub = S.userBoot; S.userBoot = null; CACHE = {};
  if (S.boot) { var nb = Object.assign({}, S.boot); if (ub && ub.user) nb.user = ub.user; delete nb.admin; S.boot = nb; }
  Object.keys(S.admin).forEach(function (k) { delete S.admin[k]; });
  S.logs = null;
  if (!quiet) toast(L('Admin locked.', 'অ্যাডমিন লক হয়েছে।'), 'success');
  if (stay) return;
  if (S.view === 'admin') go('dashboard'); else renderPage();
}
ACT['admin-lock'] = function () { lockAdmin(false); };
/* idle for 10 minutes inside Admin → locks itself */
document.addEventListener('click', function () { S.lastAct = Date.now(); }, true);
document.addEventListener('keydown', function () { S.lastAct = Date.now(); }, true);
setInterval(function () { if (S.adminOn && Date.now() - S.lastAct > 10 * 60 * 1000) lockAdmin(false); }, 30000);

function renderAdminPin() {
  var n = pinMax(), p = ADMIN_PIN, dots = '';
  for (var i = 0; i < n; i++) dots += '<div class="w-4 h-4 rounded-full transition-all duration-150 ' + (p.pin.length > i ? 'bg-pink-600 scale-125 shadow-sm shadow-pink-500/50' : 'bg-slate-200 dark:bg-slate-700') + '"></div>';
  var k = function (d) { return '<button type="button" data-act="apin-key" data-k="' + d + '" class="h-12 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-pink-600 text-base active:scale-95 transition-all cursor-pointer">' + d + '</button>'; };
  var html = '<div class="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs" data-modal="apin">' +
    '<div class="w-full max-w-xs rounded-3xl p-6 shadow-2xl border transition-all bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100' + (p.shake ? ' animate-bounce border-red-500' : '') + '">' +
    '<div class="flex justify-between items-center mb-3"><div class="flex items-center gap-2"><div class="p-2 rounded-xl bg-pink-100 dark:bg-pink-950/70 text-pink-600">' + ic('lock', 'w-5 h-5') + '</div>' +
    '<h3 class="font-bold text-sm tracking-tight">' + esc(p.title) + '</h3></div>' +
    '<button type="button" data-act="apin-close" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer">' + ic('x') + '</button></div>' +
    '<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">' + esc(p.sub) + '</p>' +
    '<div class="flex justify-center items-center gap-3 mb-5 h-9">' + dots + '</div>' +
    '<div class="grid grid-cols-3 gap-2 mb-2">' + ['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(k).join('') +
    '<button type="button" data-act="apin-clear" class="h-12 rounded-xl text-xs font-bold text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer">CLEAR</button>' + k('0') +
    '<button type="button" data-act="apin-back" class="h-12 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 cursor-pointer">⌫</button></div>' +
    (p.pin.length >= 4 && p.pin.length < n ? '<button type="button" data-act="apin-ok" class="mt-2 w-full py-2.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold cursor-pointer">' + L('Enter', 'প্রবেশ') + '</button>' : '') +
    (p.busy ? '<p class="mt-2 text-center text-xs text-slate-400">' + L('Checking...', 'যাচাই হচ্ছে...') + '</p>' : '') +
    '</div></div>';
  var old = document.querySelector('[data-modal="apin"]');
  if (old) old.outerHTML = html; else document.getElementById('modal-root').insertAdjacentHTML('beforeend', html);
}
function closeAdminPin() { var o = document.querySelector('[data-modal="apin"]'); if (o) o.remove(); ADMIN_PIN.run = null; ADMIN_PIN.done = null; }
ACT['apin-close'] = closeAdminPin;
ACT['apin-clear'] = function () { ADMIN_PIN.pin = ''; renderAdminPin(); };
ACT['apin-back'] = function () { ADMIN_PIN.pin = ADMIN_PIN.pin.slice(0, -1); renderAdminPin(); };
ACT['apin-key'] = function (el) {
  if (ADMIN_PIN.busy || ADMIN_PIN.pin.length >= pinMax()) return;
  ADMIN_PIN.pin += el.getAttribute('data-k'); renderAdminPin();
  if (ADMIN_PIN.pin.length === pinMax()) setTimeout(submitAdminPin, 40);
};
ACT['apin-ok'] = function () { submitAdminPin(); };
document.addEventListener('keydown', function (e) {
  if (!document.querySelector('[data-modal="apin"]')) {
    if (!S.token && /^[0-9]$/.test(e.key) && !(e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName))) pinPress(e.key);
    else if (!S.token && e.key === 'Backspace') { S.pin = S.pin.slice(0, -1); render(); }
    else if (!S.token && e.key === 'Enter') doLogin();
    return;
  }
  if (/^[0-9]$/.test(e.key)) { ACT['apin-key']({ getAttribute: function () { return e.key; } }); e.preventDefault(); }
  else if (e.key === 'Backspace') ACT['apin-back']();
  else if (e.key === 'Enter' && ADMIN_PIN.pin.length >= 4) submitAdminPin();
  else if (e.key === 'Escape') closeAdminPin();
});
function submitAdminPin() {
  var P = ADMIN_PIN;
  if (P.busy || P.pin.length < 4 || !P.run) return;
  P.busy = true; renderAdminPin();
  P.run(P.pin).then(function (r) {
    var done = P.done; closeAdminPin(); if (done) done(r);
  }).catch(function (e) {
    if (e && e.code === 'BAD_PIN') {
      P.busy = false; P.pin = ''; P.shake = true; renderAdminPin(); toast(e.message, 'error');
      setTimeout(function () { P.shake = false; if (document.querySelector('[data-modal="apin"]') && ADMIN_PIN === P) renderAdminPin(); }, 500);
    } else { closeAdminPin(); failToast(e); }
  });
}

/* ---------- SYNC & LIVE UPDATE ---------- */
function refreshAll(silent) {
  if (!silent) { S.syncing = true; render(); }
  return api('bootstrap', {}, { silent: true }).then(function (b) {
    setBoot(b); S.syncing = false;
    if (!silent) render(); else softRender();
    if (VIEW_LOAD[S.view]) VIEW_LOAD[S.view](true);
    if (!silent) toast(L('Synced — all data is up to date.', 'সিঙ্ক সম্পন্ন — সব ডাটা হালনাগাদ।'), 'success');
  }).catch(function (e) { S.syncing = false; if (!silent) { render(); failToast(e); } });
}
/** ইনপুটে টাইপ করার সময় পুরো পেজ রেন্ডার না করে শুধু নিরাপদ অংশ আপডেট */
function softRender() {
  var a = document.activeElement;
  var typing = a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && document.getElementById('main') && document.getElementById('main').contains(a);
  if (typing || MODALS.length) { S.pendingRender = true; return; }
  renderMain();
}
ACT['sync'] = function () { if (!S.syncing) refreshAll(false); };
setInterval(function () {
  if (!S.token || !S.boot || S.busy || document.visibilityState !== 'visible') return;
  api('rev', {}, { silent: true }).then(function (r) {
    if (r.rev && r.rev !== S.rev) { S.rev = r.rev; refreshAll(true); }
    else if (S.pendingRender && !MODALS.length) {
      var a = document.activeElement;
      if (!(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) { S.pendingRender = false; renderMain(); }
    }
  }).catch(function () {});
}, 30000);

/* warm the answers of the screens people open next, so they appear instantly */
function prefetch() {
  if (!S.token || !S.boot) return;
  try {
    swr('dashboard', { month: S.month || today().slice(0, 7), date: today() }, function () {});
    var h = histState(); swr('queryTransactions', histParams(), function () {});
  } catch (e) {}
}

/* ---------- START ---------- */
function loadPub() {
  api('boot', {}, { silent: true }).then(function (p) { takeLogo(p); S.pub = p; if (!S.token) render(); }).catch(function (e) { S.loginError = e.message; render(); });
}
function start() {
  S.month = localToday().slice(0, 7);
  render();
  if (!S.token) loadPub();
  if (S.token) {
    busy(true);
    api('bootstrap', {}, { silent: true }).then(function (b) {
      busy(false); setBoot(b); S.month = today().slice(0, 7);
      if (S.view === 'admin' || S.view === 'ledger') S.view = S.view === 'ledger' ? 'history' : 'dashboard';
      go(S.view);
      setTimeout(prefetch, 400);
    }).catch(function (e) { busy(false); S.loginError = (e && e.message) || String(e); render(); });
  }
}


/* =====================================================================
 *  VIEWS — Dashboard, Stock IN/OUT, Current Stock, History, Monthly, Ledger, Activity Log
 * ===================================================================== */

/* ---------- shared page layout: one compact card = toolbar (filters + actions) + content.
   No on-screen heading (the active menu shows where you are); the corporate title block is printed only. ---------- */
function reportShell(o) {
  // o = {tools, actions, printTitle, subTitle, body}
  var bar = (o.tools || (o.actions && o.actions.length)) ? `<div class="no-print flex flex-wrap items-center gap-1.5 mb-2">${o.tools || ''}<div class="ml-auto flex items-center gap-1">${(o.actions || []).join('')}</div></div>` : '';
  var title = o.printTitle ? `<div class="scs-head flex items-center gap-2 pb-1.5 mb-2 border-b border-slate-300 dark:border-slate-700 print:border-black">
    <img src="${esc(logoUrl())}" alt="SCS Logo" onerror="this.onerror=null;this.src=DEFAULT_LOGO" class="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-pink-200 object-contain shrink-0 bg-white">
    <div class="flex-1 min-w-0 text-center"><div class="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider leading-tight"><span>SWARUP CONSTRUCTION SOLUTION</span><span class="mx-1.5">•</span><span class="italic normal-case">"Honesty is our Business Capital"</span></div>
    <h1 class="text-sm sm:text-base font-black uppercase tracking-wide leading-tight">${esc(o.printTitle)}</h1>${o.subTitle ? `<p class="text-[11px] leading-tight text-slate-500 dark:text-slate-400">${o.subTitle}</p>` : ''}</div>
    <div class="w-9 sm:w-10 shrink-0"></div></div>` : '';
  return `<div class="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-2.5 shadow-xs border border-slate-200/80 dark:border-slate-800 print:border-none print:shadow-none print:p-0 print:m-0 print:rounded-none">${bar}${title}${o.body}</div>`;
}
function actPrint() { return `<button type="button" data-act="print" title="${L('Print', 'প্রিন্ট')}" class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-pink-600 text-white hover:bg-pink-700 active:scale-95 transition-all cursor-pointer">${ic('printer', 'w-3.5 h-3.5')}<span class="hidden sm:inline">${L('Print', 'প্রিন্ট')}</span></button>`; }
function actCsv(act) { return `<button type="button" data-act="${act}" title="CSV" class="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all cursor-pointer">${ic('file-spreadsheet', 'w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400')}<span>CSV</span></button>`; }
ACT['print'] = function () { document.body.classList.remove('print-voucher'); window.print(); };

var TH = 'py-1.5 px-1.5 border border-slate-600';
var TD = 'py-1 px-1.5 border border-slate-300 dark:border-slate-700';
var TF = 'py-1.5 px-1.5 border border-slate-400 dark:border-slate-600 font-mono font-extrabold';
/** every table: small "view mode" button on the top-right corner → full screen, frozen header, Esc to exit */
function fsBtn() {
  return `<button type="button" data-act="tbl-full" class="scs-fs-btn no-print" title="${L('View mode (full screen) — Esc to exit', 'ভিউ মোড (ফুল স্ক্রিন) — Esc চাপলে বন্ধ')}"><span class="scs-fs-off">${ic('maximize', 'w-3 h-3')}</span><span class="scs-fs-on">${ic('minimize', 'w-3.5 h-3.5')}<span>${L('Close', 'বন্ধ')} (Esc)</span></span></button>`;
}
function table(head, body, foot, extraCls) {
  return `<div class="scs-tbl">${fsBtn()}<div class="scs-tbl-in border border-slate-700 dark:border-slate-400 rounded-lg overflow-hidden"><div class="scs-tbl-scroll overflow-x-auto custom-scrollbar"><table class="w-full border-collapse text-xs font-sans print-table ${extraCls || ''}">
    <thead><tr class="bg-slate-800 text-white font-bold text-center border-b border-slate-700">${head}</tr></thead>
    <tbody class="divide-y divide-slate-300 dark:divide-slate-700 font-medium">${body}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div></div></div>`;
}
var TR = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 even:bg-slate-50/50 dark:even:bg-slate-800/30';

/* =====================================================================
 *  DASHBOARD
 * ===================================================================== */
VIEW_LOAD.dashboard = function () {
  return swr('dashboard', { month: S.month || today().slice(0, 7), date: S.dashDate || today(), period: S.dashPeriod || 'today' }, function (d) { S.dash = d; if (S.view === 'dashboard') softRender(); }).catch(failToast);
};
CH['dash-date'] = function (el) { S.dashDate = el.value; VIEW_LOAD.dashboard(); };
VIEW_RENDER.dashboard = function () {
  var d = S.dash, m = S.month || today().slice(0, 7);
  var ps = products(), tot = 0, low = 0, outS = 0;
  ps.forEach(function (p) { tot += p.stock; if (p.min > 0 && p.stock < p.min) low++; if (p.stock <= 0 && p.status === 'ACTIVE') outS++; });
  var tile = function (label, value, sub, color) {
    return `<div class="px-2 py-1.5 rounded-xl bg-white/5 border border-white/10"><span class="text-[10px] text-slate-400 font-semibold block leading-tight">${label}</span>
      <div class="text-base sm:text-lg font-black ${color} font-sans leading-tight">${value}</div><div class="text-[9px] sm:text-[10px] text-slate-400 leading-tight">${sub}</div></div>`;
  };
  var t = d ? d.today : null;
  var days = d ? d.days : [today()];
  var cards = [
    { t: L('Monthly Stock IN', 'মাসিক স্টক ইন'), a: d ? fmtN(d.monthly.inQty) : '…', s: d ? fmtN(d.monthly.lines) + ' ' + L('lines', 'লাইন') : '', v: 'history', c: 'from-emerald-600 to-teal-700', i: 'arrow-down-to-line' },
    { t: L('Monthly Stock OUT', 'মাসিক স্টক আউট'), a: d ? fmtN(d.monthly.outQty) : '…', s: d ? fmtN(d.monthly.batches) + ' ' + L('entries', 'এন্ট্রি') : '', v: 'history', c: 'from-rose-600 to-pink-700', i: 'arrow-up-from-line' },
    { t: L('Current Stock Qty', 'বর্তমান স্টক পরিমাণ'), a: fmtN(tot), s: L('All products', 'সকল প্রোডাক্ট'), v: 'stock', c: 'from-violet-600 to-purple-700', i: 'package' },
    { t: L('Total Products', 'মোট প্রোডাক্ট'), a: fmtN(ps.length), s: fmtN(ps.filter(function (p) { return p.status === 'ACTIVE'; }).length) + ' ' + L('active', 'সক্রিয়'), v: 'stock', c: 'from-sky-600 to-blue-700', i: 'boxes' },
    { t: L('Low Stock Items', 'কম স্টক আইটেম'), a: fmtN(low), s: L('Below minimum', 'মিনিমামের নিচে'), v: 'stock', f: 'low', c: 'from-amber-500 to-orange-600', i: 'triangle-alert' },
    { t: L('Out of Stock', 'স্টক শেষ'), a: fmtN(outS), s: L('Active, 0 stock', 'সক্রিয়, স্টক ০'), v: 'stock', f: 'out', c: 'from-red-600 to-rose-700', i: 'circle-alert' },
    { t: L('Transaction History', 'ট্রানজ্যাকশন হিস্টোরি'), a: d ? fmtN(d.monthly.lines) : '…', s: L('Lines this month', 'এই মাসের লাইন'), v: 'history', c: 'from-cyan-600 to-sky-700', i: 'history' }
  ];
  var recent = d ? d.recent : [];
  var top = d ? d.topOut : [];
  return `<div class="space-y-2">
  <div class="flex flex-wrap items-center gap-1.5">${monthPickerHTML()}
    <button type="button" data-act="go" data-v="entry" class="ml-auto px-2.5 py-1 rounded-lg bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer">${ic('arrow-up-down', 'w-3.5 h-3.5')}<span>${L('Stock IN / OUT', 'স্টক ইন / আউট')}</span></button></div>
  <div class="rounded-xl p-2 sm:p-2.5 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white shadow-md border border-slate-700/60">
    <div class="flex flex-wrap items-center justify-between gap-1.5 mb-1.5">
      <div class="flex items-center gap-1.5"><div class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div><span class="text-xs font-black">${window.scsDashTitle ? scsDashTitle() : L("Today's Activity", 'আজকের কার্যক্রম')}</span><span class="text-[9px] font-mono px-1.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LIVE</span></div>
      ${window.scsDashBtns ? scsDashBtns() : ''}<div style="${(S.dashPeriod || 'today') !== 'today' ? 'display:none' : ''}" class="flex items-center gap-1 bg-slate-800/90 border border-slate-700 px-2 py-0.5 rounded-lg">${ic('calendar', 'w-3.5 h-3.5 text-pink-400 shrink-0')}
        <select data-ch="dash-date" class="bg-transparent text-xs font-bold text-white focus:outline-hidden cursor-pointer">${days.map(function (x) { return `<option value="${x}" class="bg-slate-900 text-white"${x === (S.dashDate || today()) ? ' selected' : ''}>${x}</option>`; }).join('')}</select></div>
    </div>
    <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
      ${tile(L('Stock IN', 'স্টক ইন'), t ? fmtN(t.inQty) : '…', L('Received', 'গ্রহণ'), 'text-emerald-400')}
      ${tile(L('Stock OUT', 'স্টক আউট'), t ? fmtN(t.outQty) : '…', L('Issued', 'প্রদান'), 'text-amber-400')}
      ${tile(L('Entries', 'এন্ট্রি'), t ? fmtN(t.batches) : '…', (t ? fmtN(t.lines) : 0) + ' ' + L('lines', 'লাইন'), 'text-blue-400')}
      ${tile(L('Total Stock', 'মোট স্টক'), fmtN(tot), L('All products', 'সকল প্রোডাক্ট'), 'text-sky-400')}
      ${tile(L('Low Stock', 'কম স্টক'), fmtN(low), L('Below minimum', 'মিনিমামের নিচে'), 'text-purple-400')}
      ${tile(L('Out of Stock', 'স্টক শেষ'), fmtN(outS), L('Need refill', 'রিফিল দরকার'), 'text-pink-400')}
    </div>
  </div>
  <div class="grid grid-cols-2 lg:grid-cols-4 gap-2">${cards.map(function (c) {
    return `<div data-act="dash-card" data-v="${c.v}" data-f="${c.f || ''}" class="group cursor-pointer rounded-xl p-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-pink-300 dark:hover:border-pink-900/50 transition-all flex items-center gap-2.5">
      <div class="p-2 rounded-xl bg-gradient-to-tr ${c.c} shrink-0">${ic(c.i, 'w-4 h-4 text-white')}</div>
      <div class="min-w-0"><div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">${c.t}</div>
      <div class="text-base md:text-lg font-black text-slate-900 dark:text-slate-100 font-sans leading-tight">${c.a}</div>
      <div class="text-[10px] text-slate-400 truncate">${c.s}</div></div></div>`;
  }).join('')}</div>
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-2">
    <div class="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-800 shadow-xs">
      <div class="flex items-center justify-between mb-1"><h3 class="text-xs font-bold text-slate-800 dark:text-slate-100">${L('Recent Transactions', 'সাম্প্রতিক ট্রানজ্যাকশন')}</h3>
      <button type="button" data-act="go" data-v="history" class="text-[11px] font-bold text-pink-600 dark:text-pink-400 cursor-pointer mr-4">${L('View All →', 'সব দেখুন →')}</button></div>
      <div class="scs-tbl">${fsBtn()}<div class="scs-tbl-in"><div class="scs-tbl-scroll overflow-x-auto custom-scrollbar"><table class="w-full text-xs"><thead><tr class="text-left text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-200 dark:border-slate-800">
        <th class="py-1 pr-2">${L('Date', 'তারিখ')}</th><th class="py-1 pr-2">${L('Type', 'টাইপ')}</th><th class="py-1 pr-2">${L('Product', 'প্রোডাক্ট')}</th><th class="py-1 pr-2 text-right">${L('Qty', 'পরিমাণ')}</th><th class="py-1 pr-2">${L('By', 'কে')}</th></tr></thead>
        <tbody>${!d ? `<tr><td colspan="5">${loadingBlock()}</td></tr>` : recent.length ? recent.map(function (x) {
          return `<tr class="border-b border-slate-100 dark:border-slate-800/80"><td class="py-1 pr-2 whitespace-nowrap text-slate-500">${fmtD(x.date)}</td><td class="py-1 pr-2">${badgeType(x.type)}</td>
          <td class="py-1 pr-2 font-semibold text-slate-800 dark:text-slate-100"><span class="font-mono text-pink-600 dark:text-pink-400">${esc(x.code)}</span> ${esc(x.name)} <span class="text-slate-400">${esc(x.pack)}</span></td>
          <td class="py-1 pr-2 text-right font-black font-mono whitespace-nowrap">${fmtN(x.qty)} <span class="text-slate-400 font-sans font-semibold">${esc(x.unit)}</span></td><td class="py-1 pr-2 text-[11px] text-slate-500 whitespace-nowrap">${esc(x.user)}</td></tr>`;
        }).join('') : `<tr><td colspan="5" class="py-4 text-center text-slate-400">${L('No transactions yet', 'এখনো কোনো ট্রানজ্যাকশন নেই')}</td></tr>`}</tbody></table></div></div></div></div>
    <div class="rounded-xl p-2.5 bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white border border-slate-700/60 shadow-xs">
      <h3 class="text-xs font-bold mb-2 flex items-center gap-1.5">${ic('trending-up', 'w-3.5 h-3.5 text-pink-400')}${L('Top Stock OUT', 'সর্বোচ্চ স্টক আউট')} <span class="text-[10px] text-slate-400 font-semibold">${monthLabel(m)}</span></h3>
      <div class="space-y-1.5">${!d ? loadingBlock() : top.length ? top.map(function (x, i) {
        var max = top[0].qty || 1;
        return `<div><div class="flex items-center justify-between text-[11px] mb-0.5"><span class="font-semibold text-slate-200 truncate">${i + 1}. ${esc(x.code)} - ${esc(x.name)} <span class="text-slate-400">${esc(x.pack)}</span></span><span class="font-mono font-black text-amber-300 shrink-0 ml-2">${fmtN(x.qty)}</span></div>
          <div class="h-1 rounded-full bg-white/10 overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r from-pink-500 to-amber-400" style="width:${Math.max(4, Math.round(x.qty / max * 100))}%"></div></div></div>`;
      }).join('') : `<p class="text-xs text-slate-400">${L('No stock OUT this month', 'এই মাসে কোনো স্টক আউট নেই')}</p>`}</div></div>
  </div></div>`;
};
ACT['dash-card'] = function (el) {
  var f = el.getAttribute('data-f');
  S.stock.filter = f || 'all';
  if (f) S.stock.f = { dmode: 'all' };
  if (el.getAttribute('data-v') === 'history') { S.hist = null; var hf = histState().f; hf.dmode = 'month'; hf.date = ''; hf.month = S.month || today().slice(0, 7); }
  go(el.getAttribute('data-v'));
};

/* =====================================================================
 *  1. STOCK IN / OUT
 * ===================================================================== */
function newRow() { return { id: uid(), pid: '', text: '', q: '' }; }
function entryState() {
  if (!S.entry) S.entry = { date: today(), remarks: '', rows: [newRow(), newRow(), newRow()], reqId: uid(), sg: null };
  return S.entry;
}
VIEW_RENDER.entry = function () {
  var e = entryState(), lb = S.boot.lastBatch;
  var last = lb && lb.length ? (function () {
    var t = lb[0], isIn = t.type === 'IN', n = lb.length, show = lb.slice(0, 4);
    return `<div class="no-print flex items-start gap-2 rounded-lg px-2.5 py-1.5 mb-2 bg-slate-900 text-white border border-slate-700/60 text-[11px]">
      <div class="w-2 h-2 mt-1 rounded-full ${isIn ? 'bg-emerald-400' : 'bg-rose-400'} shrink-0"></div>
      <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span class="text-slate-400 font-semibold">${L('Last transaction', 'শেষ ট্রানজ্যাকশন')}</span>${badgeType(t.type)}<span class="font-bold">${fmtD(t.date)} ${esc(String(t.time).slice(0, 5))}</span><span class="text-pink-300 font-semibold">${esc(t.user)}</span><span class="text-slate-400">${n} ${L('item(s)', 'টি আইটেম')}</span></div>
      <div class="mt-0.5 text-slate-300 leading-snug">${show.map(function (x) { return `<span class="inline-block" style="margin-right:14px"><b class="font-mono text-pink-300">${esc(x.code)}</b> ${esc(x.name)} <b class="font-mono text-amber-300">× ${fmtN(x.qty)}</b> ${esc(x.unit)}</span>`; }).join('')}${n > 4 ? `<span class="text-slate-500">+${n - 4} ${L('more', 'আরও')}</span>` : ''}</div></div>
      <button type="button" data-act="ent-last" class="px-2 py-0.5 rounded-md font-bold bg-white/10 hover:bg-white/20 border border-white/20 cursor-pointer shrink-0 flex items-center gap-1">${ic('eye', 'w-3 h-3')}${L('View', 'দেখুন')}</button></div>`;
  })() : '';
  var body = last + `
    <div class="flex flex-wrap items-center gap-1.5 mb-2">
      <div class="flex items-center gap-1 shrink-0">${ic('calendar', 'w-3.5 h-3.5 text-pink-600')}<input type="date" id="ent-date" data-ch="ent-date" max="${today()}" value="${esc(e.date)}" title="${L('Transaction Date', 'ট্রানজ্যাকশন তারিখ')}" class="${SEL}"></div>
      <input type="text" id="ent-remarks" data-in="ent-remarks" maxlength="300" value="${esc(e.remarks)}" placeholder="${L('Reference / Remarks (optional)', 'রেফারেন্স / মন্তব্য (ঐচ্ছিক)')}" class="${INP} flex-1 min-w-40">
    </div>
    <div id="ent-rows">${entryRowsHTML()}</div>
    <div class="no-print scs-entry-bar sticky bottom-0 mt-2 -mx-2 sm:-mx-2.5 px-2 sm:px-2.5 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-t border-slate-200 dark:border-slate-800 rounded-b-xl">
      <div class="grid grid-cols-4 gap-1.5">
        <button type="button" data-act="ent-add" class="py-2 rounded-lg text-xs sm:text-sm font-bold bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 border border-pink-300 dark:border-pink-800 hover:bg-pink-100 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1">${ic('plus', 'w-3.5 h-3.5')}${L('Add Row', 'সারি যোগ')}</button>
        <button type="button" data-act="ent-clear" class="py-2 rounded-lg text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1">${ic('rotate-ccw', 'w-3.5 h-3.5')}${L('Clear', 'মুছুন')}</button>
        <button type="button" data-act="ent-submit" data-type="IN" class="py-2 rounded-lg text-xs sm:text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1">${ic('arrow-down-to-line', 'w-3.5 h-3.5')}${L('Stock IN', 'স্টক ইন')}</button>
        <button type="button" data-act="ent-submit" data-type="OUT" class="py-2 rounded-lg text-xs sm:text-sm font-black bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1">${ic('arrow-up-from-line', 'w-3.5 h-3.5')}${L('Stock OUT', 'স্টক আউট')}</button>
      </div></div>`;
  return `<div class="scs-entry">${reportShell({ body: body })}</div>`;
};
function entryRowsHTML() {
  var e = entryState(), tq = 0, n = 0;
  var COLS = 'sm:grid sm:grid-cols-[2rem_minmax(0,1fr)_4.5rem_5.5rem_7.5rem_2.25rem]';
  var head = `<div class="hidden ${COLS} bg-slate-800 text-white text-[11px] font-bold text-center border-b border-slate-700">
    <div class="py-1.5 px-1 border-r border-slate-600">#</div><div class="py-1.5 px-2 border-r border-slate-600 text-left">${L('Product (Code - Name - Pack)', 'প্রোডাক্ট (কোড - নাম - প্যাক)')}</div><div class="py-1.5 px-1 border-r border-slate-600">${L('Unit', 'ইউনিট')}</div>
    <div class="py-1.5 px-1.5 border-r border-slate-600 text-right bg-slate-900">${L('Stock', 'স্টক')}</div><div class="py-1.5 px-1.5 border-r border-slate-600 text-right text-amber-200">${L('Quantity', 'পরিমাণ')}</div><div class="py-1.5 px-1"></div></div>`;
  var rows = e.rows.map(function (r, i) {
    var p = r.pid ? productById(r.pid) : null;
    if (p && Number(r.q) > 0) { tq += Number(r.q); n++; }
    var lowCls = p && p.min > 0 && p.stock < p.min ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100';
    return `<div class="scs-er flex flex-wrap items-stretch ${COLS} border-b border-slate-300 dark:border-slate-700 even:bg-slate-50/50 dark:even:bg-slate-800/30 text-xs${p ? '' : ' scs-er-empty'}" data-row="${r.id}">
      <div class="scs-er-i w-6 sm:w-auto flex items-center justify-center text-slate-500 font-mono sm:border-r border-slate-300 dark:border-slate-700">${i + 1}</div>
      <div class="scs-er-p relative flex-1 min-w-0 p-1 sm:border-r border-slate-300 dark:border-slate-700"><input type="text" enterkeyhint="search" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" data-in="ent-prod" data-kd="ent-prod" data-row="${r.id}" id="ep-${r.id}" value="${esc(r.text)}" placeholder="${L('Tap to search product', 'ট্যাপ করে প্রোডাক্ট খুঁজুন')}"
        class="scs-inp w-full px-2 py-1.5 rounded-md border ${p ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'} text-sm font-semibold focus:outline-hidden focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20">
        <div id="sg-${r.id}"></div></div>
      <div class="scs-er-u flex sm:justify-center items-center gap-1 font-bold text-slate-600 dark:text-slate-300 sm:border-r border-slate-300 dark:border-slate-700 sm:px-1"><span class="sm:hidden text-[10px] text-slate-400 font-semibold">${L('Unit', 'ইউনিট')}:</span><span id="eu-${r.id}">${p ? esc(p.unit || '-') : ''}</span></div>
      <div class="scs-er-s flex sm:justify-end items-center gap-1 font-mono font-black sm:border-r border-slate-300 dark:border-slate-700 sm:px-1.5 ${lowCls}"><span class="sm:hidden text-[10px] text-slate-400 font-sans font-semibold">${L('Stock', 'স্টক')}:</span><span id="es-${r.id}">${p ? fmtN(p.stock) : ''}</span></div>
      <div class="scs-er-q p-1 sm:border-r border-slate-300 dark:border-slate-700"><input type="number" inputmode="decimal" enterkeyhint="next" step="any" min="0" data-in="ent-qty" data-kd="ent-qty" data-row="${r.id}" id="eq-${r.id}" value="${esc(r.q)}" placeholder="${L('Qty', 'পরিমাণ')}"
          class="scs-inp w-full px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-black font-mono text-right focus:outline-hidden focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20"></div>
      <div class="scs-er-d flex items-center justify-center"><button type="button" data-act="ent-del" data-row="${r.id}" title="${L('Remove row', 'সারি মুছুন')}" class="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer">${ic('x', 'w-4 h-4')}</button></div>
      <div class="scs-er-br"></div></div>`;
  }).join('');
  var foot = `<div class="flex items-center justify-end gap-3 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-extrabold font-mono"><span class="font-sans">${L('Items', 'আইটেম')}: <span id="ent-n">${n}</span></span><span class="font-sans">${L('TOTAL QTY =', 'মোট পরিমাণ =')}</span><span id="ent-tq" class="text-sm">${fmtN(tq)}</span></div>`;
  return `<div class="border border-slate-700 dark:border-slate-400 rounded-lg">${head}${rows}${foot}</div>`;
}
function entryRow(id) { return entryState().rows.filter(function (r) { return r.id === id; })[0]; }
function entryTotals() {
  var e = entryState(), tq = 0, n = 0;
  e.rows.forEach(function (r) { if (r.pid && Number(r.q) > 0) { tq += Number(r.q); n++; } });
  var a = document.getElementById('ent-tq'), b = document.getElementById('ent-n');
  if (a) a.textContent = fmtN(tq); if (b) b.textContent = n;
}
function rerenderRows(focusId) {
  var c = document.getElementById('ent-rows'); if (c) c.innerHTML = entryRowsHTML();
  if (focusId) { var f = document.getElementById(focusId); if (f) { f.focus(); if (f.select) f.select(); } }
}
function suggestList(text) {
  var q = String(text || '').trim().toLowerCase();
  var list = products().filter(function (p) { return p.status === 'ACTIVE'; });
  if (q) {
    var words = q.split(/\s+/);
    list = list.filter(function (p) { var h = (p.code + ' ' + p.name + ' ' + p.pack + ' ' + p.cat + ' ' + p.unit).toLowerCase(); return words.every(function (w) { return h.indexOf(w) >= 0; }); });
  }
  return list.slice(0, 40);
}
/* ---------- mobile: keep the dropdown above the on-screen keyboard ---------- */
var IS_TOUCH = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
function viewH() { var vv = window.visualViewport; return vv ? vv.height + vv.offsetTop : window.innerHeight; }
/** list opens below the input; on phones the input is scrolled near the top so the list has room above the keyboard */
function fitDrop(inp, box) {
  var list = box && box.firstElementChild; if (!inp || !list) return;
  var r = inp.getBoundingClientRect(), vh = viewH();
  if (IS_TOUCH || window.innerWidth < 640) {
    var hdr = 6, want = r.top - hdr;
    if (want > 24 && (vh - r.bottom) < 260) { window.scrollBy(0, want); r = inp.getBoundingClientRect(); }
  }
  var below = vh - r.bottom - 10;
  // keyboard size cannot always be measured inside the Apps Script frame → never taller than ~40% of the screen on phones
  var cap = IS_TOUCH ? Math.round(window.innerHeight * 0.4) : 300;
  list.style.maxHeight = Math.max(120, Math.min(cap, below)) + 'px';
}
function showSuggest(r) {
  var box = document.getElementById('sg-' + r.id); if (!box) return;
  var list = suggestList(r.text), e = entryState();
  e.sg = { row: r.id, list: list, idx: e.sg && e.sg.row === r.id ? Math.max(0, Math.min(e.sg.idx, list.length - 1)) : 0 };
  if (!list.length) { box.innerHTML = `<div class="absolute left-1 right-1 top-full z-30 mt-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-2.5 text-xs text-slate-400">${L('No active product matches', 'কোনো সক্রিয় প্রোডাক্ট মেলেনি')}</div>`; return; }
  box.innerHTML = `<div class="scs-drop absolute left-1 right-1 top-full z-30 mt-0.5 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl custom-scrollbar">${list.map(function (p, i) {
    return `<button type="button" onmousedown="event.preventDefault()" data-act="ent-pick" data-row="${r.id}" data-pid="${esc(p.id)}" class="w-full text-left px-2.5 py-2 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 cursor-pointer ${i === e.sg.idx ? 'bg-pink-50 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60'}">
      <span class="text-sm leading-tight"><span class="font-mono font-bold text-pink-600 dark:text-pink-400">${esc(p.code)}</span> <span class="font-semibold text-slate-800 dark:text-slate-100">${esc(p.name)}</span> ${p.pack ? `<span class="text-slate-400">(${esc(p.pack)})</span>` : ''}</span>
      <span class="text-[11px] font-mono font-bold shrink-0 ${p.min > 0 && p.stock < p.min ? 'text-rose-600' : 'text-slate-500'}">${fmtN(p.stock)} ${esc(p.unit)}</span></button>`;
  }).join('')}</div>`;
  fitDrop(document.getElementById('ep-' + r.id), box);
  var act = box.querySelectorAll('button')[e.sg.idx];
  if (act && act.scrollIntoView) { var lst = box.firstElementChild; if (act.offsetTop < lst.scrollTop || act.offsetTop + act.offsetHeight > lst.scrollTop + lst.clientHeight) lst.scrollTop = act.offsetTop - 4; }
}
function hideSuggest() { $$('[id^="sg-"]').forEach(function (b) { b.innerHTML = ''; }); if (S.entry) S.entry.sg = null; }
document.addEventListener('focusout', function (e) {
  if (e.target && e.target.getAttribute && e.target.getAttribute('data-in') === 'ent-prod') setTimeout(function () {
    var a = document.activeElement; if (!(a && a.getAttribute && a.getAttribute('data-in') === 'ent-prod')) hideSuggest();
  }, 150);
});
/* the product list opens ONLY when the search box is tapped/clicked or typed in — never just because a row was added */
document.addEventListener('click', function (e) {
  var el = e.target && e.target.closest && e.target.closest('[data-in="ent-prod"]');
  if (!el) return;
  var r = entryRow(el.getAttribute('data-row')); if (!r) return;
  if (S.entry.sg && S.entry.sg.row === r.id) return;
  if (r.pid) { el.select(); r.text = ''; }   // tap on a picked product = choose again (full list)
  hideSuggest(); showSuggest(r);
  if (r.pid) r.text = el.value;
});
/* keyboard opening/closing on phones changes the visible height → refit the open list */
if (window.visualViewport) window.visualViewport.addEventListener('resize', function () {
  var sg = S.entry && S.entry.sg; if (!sg) return;
  fitDrop(document.getElementById('ep-' + sg.row), document.getElementById('sg-' + sg.row));
});
/* phones: while typing, the sticky header / action bar step aside so they never cover the input or the list */
document.addEventListener('focusin', function (e) {
  var t = e.target;
  if (IS_TOUCH && t && /INPUT|TEXTAREA/.test(t.tagName) && !/checkbox|radio|file|date|month/.test(t.type || '') && t.closest && t.closest('#main')) document.body.classList.add('scs-kb');
});
document.addEventListener('focusout', function () {
  setTimeout(function () { var a = document.activeElement; if (!(a && /INPUT|TEXTAREA/.test(a.tagName) && a.closest && a.closest('#main'))) document.body.classList.remove('scs-kb'); }, 200);
});
IN['ent-prod'] = function (el) {
  var r = entryRow(el.getAttribute('data-row')); if (!r) return;
  r.text = el.value;
  if (r.pid) { var rowEl = el.closest('.scs-er'); if (rowEl) rowEl.classList.add('scs-er-empty'); r.pid = ''; el.className = el.className.replace('border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20', 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'); var u = document.getElementById('eu-' + r.id), s = document.getElementById('es-' + r.id); if (u) u.textContent = ''; if (s) s.textContent = ''; entryTotals(); }
  if (S.entry.sg) S.entry.sg.idx = 0;
  showSuggest(r);
};
KD['ent-prod'] = function (el, e) {
  var sg = S.entry && S.entry.sg;
  if (!sg || !sg.list.length) {
    if (e.key === 'ArrowDown') { e.preventDefault(); var r0 = entryRow(el.getAttribute('data-row')); if (r0) showSuggest(r0); }
    return;
  }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault(); sg.idx = (sg.idx + (e.key === 'ArrowDown' ? 1 : -1) + sg.list.length) % sg.list.length;
    showSuggest(entryRow(sg.row));
  } else if (e.key === 'Enter') { e.preventDefault(); pickProduct(sg.row, sg.list[sg.idx].id); }
  else if (e.key === 'Escape') { e.stopPropagation(); hideSuggest(); }
};
function pickProduct(rowId, pid) {
  var r = entryRow(rowId), p = productById(pid); if (!r || !p) return;
  r.pid = p.id; r.text = prodLabel(p);
  hideSuggest(); rerenderRows('eq-' + r.id);
}
ACT['ent-pick'] = function (el) { pickProduct(el.getAttribute('data-row'), el.getAttribute('data-pid')); };
IN['ent-qty'] = function (el) { var r = entryRow(el.getAttribute('data-row')); if (r) { r.q = el.value; entryTotals(); } };
IN['ent-remarks'] = function (el) { entryState().remarks = el.value; };
CH['ent-date'] = function (el) { entryState().date = el.value || today(); };
KD['ent-qty'] = function (el, e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  var rows = entryState().rows, i = rows.indexOf(entryRow(el.getAttribute('data-row')));
  if (i === rows.length - 1) { rows.push(newRow()); rerenderRows(); }
  var f = document.getElementById('ep-' + rows[i + 1].id); if (f) f.focus();   // focus only — list opens when you type / tap
};
/* Add Row: only adds an empty row (no auto focus, so no product list pops up) */
ACT['ent-add'] = function () {
  var rows = entryState().rows; rows.push(newRow()); hideSuggest(); rerenderRows();
  var nr = document.querySelector('[data-row="' + rows[rows.length - 1].id + '"]');
  if (nr && nr.scrollIntoView) nr.scrollIntoView({ block: 'nearest' });
};
ACT['ent-del'] = function (el) {
  var e = entryState(), id = el.getAttribute('data-row');
  if (e.rows.length === 1) e.rows = [newRow()]; else e.rows = e.rows.filter(function (r) { return r.id !== id; });
  rerenderRows();
};
ACT['ent-clear'] = function () { var e = entryState(); e.rows = [newRow(), newRow(), newRow()]; e.remarks = ''; e.reqId = uid(); renderMain(); };
ACT['ent-submit'] = function (el) {
  var type = el.getAttribute('data-type'), e = entryState(), items = [], need = {};
  for (var i = 0; i < e.rows.length; i++) {
    var r = e.rows[i];
    if (!r.text.trim() && !String(r.q).trim()) continue;
    if (!r.pid) return toast(L('Row ', 'সারি ') + (i + 1) + L(': select a product from the list.', ': তালিকা থেকে প্রোডাক্ট নির্বাচন করুন।'), 'error');
    var q = Number(r.q);
    if (!(q > 0)) return toast(L('Row ', 'সারি ') + (i + 1) + L(': quantity must be greater than 0.', ': পরিমাণ ০-এর বেশি দিন।'), 'error');
    need[r.pid] = (need[r.pid] || 0) + q;
    items.push({ productId: r.pid, qty: q });
  }
  if (!items.length) return toast(L('Add at least 1 product with quantity.', 'কমপক্ষে ১টি প্রোডাক্ট ও পরিমাণ দিন।'), 'error');
  if (type === 'OUT') {
    for (var pid in need) {
      var p = productById(pid);
      if (p && need[pid] > p.stock + 1e-9) return toast(p.code + ' - ' + p.name + L(': not enough stock (available ', ': স্টক কম (বর্তমান ') + fmtN(p.stock) + ')', 'error');
    }
  }
  if (e.date > today()) return toast(L('Future date is not allowed.', 'ভবিষ্যতের তারিখ দেওয়া যাবে না।'), 'error');
  api('saveTransactions', { type: type, date: e.date, remarks: e.remarks, items: items, requestId: e.reqId }).then(function (r) {
    CACHE = {}; setBoot(r.boot);
    S.entry = null; entryState().date = e.date;
    renderMain();
    showBatch(r.batch, true);
  }).catch(failToast);
};
ACT['ent-last'] = function () { if (S.boot.lastBatch) showBatch(S.boot.lastBatch, false); };

/* ---------- Batch voucher (success popup + PDF + print) ---------- */
var CUR_BATCH = null;
function showBatch(batch, fresh) {
  CUR_BATCH = batch;
  var b = batch[0], isIn = b.type === 'IN';
  var body = `<div class="space-y-3">
    ${fresh ? `<div class="flex items-center gap-3 p-3 rounded-2xl ${isIn ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900' : 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900'}">
      ${ic('circle-check', 'w-8 h-8 ' + (isIn ? 'text-emerald-600' : 'text-rose-600'))}<div><div class="text-base font-black ${isIn ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}">${isIn ? L('Stock IN Successful', 'স্টক ইন সফল') : L('Stock OUT Successful', 'স্টক আউট সফল')}</div>
      <div class="text-xs text-slate-500">${L('Saved to database and history.', 'ডাটাবেজ ও হিস্টোরিতে সেভ হয়েছে।')}</div></div></div>` : ''}
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
      ${[[L('Type', 'টাইপ'), badgeType(b.type)], [L('Date', 'তারিখ'), fmtD(b.date) + ' ' + esc(String(b.time).slice(0, 5))], [L('Entered by', 'এন্ট্রি করেছেন'), esc(b.user)], [L('Batch', 'ব্যাচ'), `<span class="font-mono text-[10px]">${esc(b.batch)}</span>`]].map(function (x) {
        return `<div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"><div class="text-[10px] text-slate-400 font-bold uppercase">${x[0]}</div><div class="font-bold mt-0.5">${x[1]}</div></div>`;
      }).join('')}</div>
    ${b.remarks ? `<div class="text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"><b>${L('Remarks', 'মন্তব্য')}:</b> ${esc(b.remarks)}</div>` : ''}
    ${table(`<th class="${TH}">SL</th><th class="${TH}">${L('Code', 'কোড')}</th><th class="${TH} text-left">${L('Product', 'প্রোডাক্ট')}</th><th class="${TH}">${L('Pack', 'প্যাক')}</th><th class="${TH} text-right text-amber-200">${L('Qty', 'পরিমাণ')}</th><th class="${TH} text-right">${L('Prev', 'আগের')}</th><th class="${TH} text-right bg-slate-900">${L('New Stock', 'নতুন স্টক')}</th>`,
      batch.map(function (x, i) { return `<tr class="${TR}"><td class="${TD} text-center font-mono text-slate-500">${i + 1}</td><td class="${TD} text-center font-mono font-bold">${esc(x.code)}</td><td class="${TD} font-semibold">${esc(x.name)}</td><td class="${TD} text-center">${esc(x.pack)}</td><td class="${TD} text-right font-mono font-black">${fmtN(x.qty)} <span class="font-sans text-slate-400">${esc(x.unit)}</span></td><td class="${TD} text-right font-mono">${fmtN(x.prev)}</td><td class="${TD} text-right font-mono font-black">${fmtN(x.next)}</td></tr>`; }).join(''))}
  </div>`;
  openModal({ id: 'batch', title: (isIn ? L('Stock IN Voucher', 'স্টক ইন ভাউচার') : L('Stock OUT Voucher', 'স্টক আউট ভাউচার')), sub: batch.length + ' ' + L('item(s)', 'টি আইটেম'), icon: isIn ? 'arrow-down-to-line' : 'arrow-up-from-line', size: 'max-w-3xl', body: body,
    foot: btn(L('Download PDF', 'PDF ডাউনলোড'), 'batch-pdf', 'dark', 'download') + btn(L('Print', 'প্রিন্ট'), 'batch-print', 'outline', 'printer') + btn('OK', 'modal-close', 'primary', '', 'data-id="batch" autofocus') });
}
function voucherHTML(batch) {
  var b = batch[0];
  return `<div class="p-6 text-slate-900"><div class="text-center border-b border-black pb-2 mb-3"><div class="text-xs font-semibold uppercase tracking-wider">SWARUP CONSTRUCTION SOLUTION • "Honesty is our Business Capital"</div>
    <h1 class="text-lg font-black uppercase">${esc(storeName())} — STOCK ${esc(b.type === 'ADJ' ? 'OPENING' : b.type)} VOUCHER</h1></div>
    <div class="grid grid-cols-2 gap-1 text-xs mb-3"><div><b>Batch:</b> ${esc(b.batch)}</div><div><b>Date:</b> ${fmtD(b.date)} ${esc(String(b.time).slice(0, 5))}</div><div><b>Entered by:</b> ${esc(b.user)}</div><div><b>Remarks:</b> ${esc(b.remarks || '-')}</div></div>
    <table class="w-full border-collapse text-xs print-table"><thead><tr><th class="border px-2 py-1">SL</th><th class="border px-2 py-1">Code</th><th class="border px-2 py-1 text-left">Product</th><th class="border px-2 py-1">Pack</th><th class="border px-2 py-1">Unit</th><th class="border px-2 py-1 text-right">Qty</th><th class="border px-2 py-1 text-right">Prev</th><th class="border px-2 py-1 text-right">New</th></tr></thead>
    <tbody>${batch.map(function (x, i) { return `<tr><td class="border px-2 py-1 text-center">${i + 1}</td><td class="border px-2 py-1 text-center">${esc(x.code)}</td><td class="border px-2 py-1">${esc(x.name)}</td><td class="border px-2 py-1 text-center">${esc(x.pack)}</td><td class="border px-2 py-1 text-center">${esc(x.unit)}</td><td class="border px-2 py-1 text-right font-bold">${fmtN(x.qty)}</td><td class="border px-2 py-1 text-right">${fmtN(x.prev)}</td><td class="border px-2 py-1 text-right">${fmtN(x.next)}</td></tr>`; }).join('')}</tbody></table>
    <div class="grid grid-cols-3 gap-6 mt-14 text-xs text-center"><div class="border-t border-black pt-1">Prepared By</div><div class="border-t border-black pt-1">Store In-charge</div><div class="border-t border-black pt-1">Authorized By</div></div></div>`;
}
ACT['batch-print'] = function () {
  var pr = document.getElementById('print-root');
  if (!pr) { pr = document.createElement('div'); pr.id = 'print-root'; document.body.appendChild(pr); }
  pr.innerHTML = voucherHTML(CUR_BATCH);
  document.body.classList.add('print-voucher');
  setTimeout(function () { window.print(); setTimeout(function () { document.body.classList.remove('print-voucher'); }, 500); }, 50);
};
function loadScript(src) {
  return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = function () { rej(new Error('Could not load ' + src)); }; document.head.appendChild(s); });
}
ACT['batch-pdf'] = function () {
  var batch = CUR_BATCH; if (!batch) return;
  var ready = window.jspdf ? Promise.resolve() : loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    .then(function () { return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'); });
  busy(true);
  ready.then(function () {
    busy(false);
    var b = batch[0], doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFontSize(9); doc.setTextColor(80); doc.text('SWARUP CONSTRUCTION SOLUTION  •  "Honesty is our Business Capital"', 105, 14, { align: 'center' });
    doc.setFontSize(15); doc.setTextColor(15, 23, 42); doc.text(storeName() + ' — STOCK ' + (b.type === 'ADJ' ? 'OPENING' : b.type) + ' VOUCHER', 105, 22, { align: 'center' });
    doc.setDrawColor(219, 39, 119); doc.setLineWidth(0.6); doc.line(14, 25, 196, 25);
    doc.setFontSize(9.5);
    doc.text('Batch: ' + b.batch, 14, 32); doc.text('Date: ' + fmtD(b.date) + ' ' + String(b.time).slice(0, 5), 196, 32, { align: 'right' });
    doc.text('Entered by: ' + b.user, 14, 38); doc.text('Remarks: ' + (b.remarks || '-'), 196, 38, { align: 'right' });
    doc.autoTable({ startY: 43, head: [['SL', 'Code', 'Product', 'Pack', 'Unit', 'Qty', 'Prev Stock', 'New Stock']],
      body: batch.map(function (x, i) { return [i + 1, x.code, x.name, x.pack, x.unit, fmtN(x.qty), fmtN(x.prev), fmtN(x.next)]; }),
      styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [30, 41, 59], textColor: 255 }, alternateRowStyles: { fillColor: [244, 247, 251] },
      columnStyles: { 0: { halign: 'center' }, 5: { halign: 'right', fontStyle: 'bold' }, 6: { halign: 'right' }, 7: { halign: 'right' } } });
    var y = (doc.lastAutoTable ? doc.lastAutoTable.finalY : 60) + 28;
    ['Prepared By', 'Store In-charge', 'Authorized By'].forEach(function (s, i) { var x = 14 + i * 64; doc.line(x, y, x + 50, y); doc.text(s, x + 25, y + 5, { align: 'center' }); });
    doc.save('SCS_Stock_' + b.type + '_' + b.batch + '.pdf');
  }).catch(function (e) { busy(false); toast(L('PDF library could not load — use Print instead.', 'PDF লাইব্রেরি লোড হয়নি — প্রিন্ট ব্যবহার করুন।'), 'error'); });
};

/* =====================================================================
 *  2. CURRENT STOCK
 * ===================================================================== */
/* Lifetime = stock right now (from the product list). Year / Month / Date = Opening → IN → OUT → Closing of that period. */
function stockF() { if (!S.stock.f) S.stock.f = { dmode: 'all' }; return S.stock.f; }
function stockKey() { var r = periodRange(stockF()); return r.from + '|' + r.to; }
VIEW_LOAD.stock = function () {
  var f = stockF(); if (f.dmode === 'all') return;
  var key = stockKey(), r = periodRange(f);
  return swr('stockReport', r, function (d) { S.stock.rep = d; S.stock.repKey = key; if (S.view === 'stock') softRender(); }).catch(failToast);
};
bindPeriod('stk', stockF, function () { S.stock.rep = null; renderMain(); VIEW_LOAD.stock(); });
function stockRows() {
  var st = S.stock, q = st.q.trim().toLowerCase(), f = stockF();
  var src;
  if (f.dmode === 'all') src = products().map(function (p) { return { p: p, stock: p.stock }; });
  else if (st.rep && st.repKey === stockKey()) src = st.rep.rows.map(function (r) { return { p: r, stock: r.closing, r: r }; });
  else return null;
  return src.filter(function (x) {
    var p = x.p;
    if (st.filter === 'low' && !(p.min > 0 && x.stock < p.min)) return false;
    if (st.filter === 'out' && !(x.stock <= 0 && p.status === 'ACTIVE')) return false;
    if (st.filter === 'inactive' && p.status !== 'INACTIVE') return false;
    if (st.cat && p.cat !== st.cat) return false;
    if (q && (p.order + ' ' + p.code + ' ' + p.name + ' ' + p.pack + ' ' + p.cat + ' ' + p.unit).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
VIEW_RENDER.stock = function () {
  var ps = products(), st = S.stock, f = stockF();
  var low = ps.filter(function (p) { return p.min > 0 && p.stock < p.min; }).length;
  var out = ps.filter(function (p) { return p.stock <= 0 && p.status === 'ACTIVE'; }).length;
  var inact = ps.filter(function (p) { return p.status === 'INACTIVE'; }).length;
  var cats = []; ps.forEach(function (p) { if (p.cat && cats.indexOf(p.cat) < 0) cats.push(p.cat); });
  var fchip = function (id, label, n) {
    var a = st.filter === id;
    return `<button type="button" data-act="stk-filter" data-f="${id}" class="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold whitespace-nowrap cursor-pointer ${a ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'}">${label}${f.dmode === 'all' && n !== undefined ? `<span class="px-1 rounded-full text-[10px] ${a ? 'bg-white/25' : 'bg-slate-200 dark:bg-slate-700'}">${n}</span>` : ''}</button>`;
  };
  var tools = periodBar('stk', f, PERIOD_STOCK) +
    searchBox('data-in="stk-q"', st.q, L('Search SL / code / product / pack / category', 'SL / কোড / প্রোডাক্ট / প্যাক / ক্যাটাগরি খুঁজুন')) +
    `<div class="flex items-center gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">${fchip('all', L('All', 'সব'), ps.length)}${fchip('low', L('Low', 'কম স্টক'), low)}${fchip('out', L('Out', 'স্টক শেষ'), out)}${inact ? fchip('inactive', L('Inactive', 'নিষ্ক্রিয়'), inact) : ''}</div>` +
    (cats.length ? `<select data-ch="stk-cat" class="${SELC}">${opt('', L('All categories', 'সব ক্যাটাগরি'), st.cat)}${cats.sort().map(function (c) { return opt(c, c, st.cat); }).join('')}</select>` : '');
  return reportShell({ tools: tools, actions: [actPrint(), actCsv('stk-csv')],
    printTitle: 'MATERIALS STOCK — ' + (f.dmode === 'all' ? fmtD(today()).toUpperCase() : periodUpper(f)), body: `<div id="stk-table">${stockTableHTML()}</div>` });
};
/** সংখ্যা → ইংরেজি কথায় (লাখ/কোটি পদ্ধতি) */
function numWords(n) {
  n = Math.round(Number(n) * 100) / 100; if (!isFinite(n)) return '';
  if (n === 0) return 'Zero';
  var neg = n < 0; n = Math.abs(n);
  var ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  var two = function (x) { return x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? '-' + ones[x % 10] : ''); };
  var three = function (x) { return (x >= 100 ? ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' : '') : '') + (x % 100 ? two(x % 100) : ''); };
  var ip = Math.floor(n), fp = Math.round((n - ip) * 100), out = [];
  var crore = Math.floor(ip / 10000000); ip %= 10000000;
  var lakh = Math.floor(ip / 100000); ip %= 100000;
  var th = Math.floor(ip / 1000); ip %= 1000;
  if (crore) out.push(three(crore) + ' Crore');
  if (lakh) out.push(two(lakh) + ' Lakh');
  if (th) out.push(two(th) + ' Thousand');
  if (ip) out.push(three(ip));
  var w = out.join(' ');
  if (fp) w += (w ? ' ' : 'Zero ') + 'Point ' + String(fp < 10 ? '0' + fp : fp).replace(/0$/, '').split('').map(function (d) { return d === '0' ? 'Zero' : ones[Number(d)]; }).join(' ');
  return (neg ? 'Minus ' : '') + w;
}
/** টেবিলের একদম নিচের সারি: "In Words" */
function wordsRow(cols, total) {
  return `<tr class="bg-white dark:bg-slate-900"><td colspan="${cols}" class="${TF} text-left font-sans font-bold normal-case">${L('In Words', 'কথায়')}: ${esc(numWords(total))} ${L('Only', 'মাত্র')}</td></tr>`;
}
function stockTableHTML() {
  var rows = stockRows(), f = stockF(), life = f.dmode === 'all';
  if (!rows) return loadingBlock();
  var tot = { o: 0, i: 0, x: 0, a: 0, c: 0 }, hasAdj = !life && rows.some(function (x) { return x.r.adj; });
  var tag = function (p, low) {
    return (low ? `<span class="ml-1 text-[9px] px-1 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded font-bold">LOW</span>` : '') +
      (p.deleted ? `<span class="ml-1 text-[9px] px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-bold">${L('Deleted', 'ডিলিটেড')}</span>` : p.status !== 'ACTIVE' ? `<span class="ml-1 text-[9px] px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-bold">${L('Inactive', 'নিষ্ক্রিয়')}</span>` : '');
  };
  var body = rows.map(function (x, i) {
    var p = x.p, low = p.min > 0 && x.stock < p.min;
    tot.c += x.stock;
    var first = `<td class="${TD} text-center text-slate-500 font-mono">${life ? p.order : i + 1}</td><td class="${TD} text-center font-mono font-bold whitespace-nowrap">${esc(p.code)}</td>
      <td class="${TD} font-semibold ${low ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'}"><button type="button" data-act="stk-ledger" data-pid="${esc(p.id)}" class="text-left hover:underline cursor-pointer">${esc(p.name)}</button>${tag(p, low)}</td>
      <td class="${TD} text-center font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">${esc(p.pack || '-')}</td><td class="${TD} text-center">${esc(p.unit || '-')}</td>`;
    if (life) return `<tr class="${TR}${p.status !== 'ACTIVE' ? ' opacity-60' : ''}">${first}<td class="${TD} text-center text-slate-500">${esc(p.cat || '-')}</td>
      <td class="${TD} text-center font-mono font-black stk-cur bg-cyan-50 dark:bg-cyan-950/30">${fmtN(x.stock)}</td><td class="${TD} text-center font-mono text-slate-500">${p.min ? fmtN(p.min) : '-'}</td></tr>`;
    var r = x.r; tot.o += r.opening; tot.i += r.tin; tot.x += r.tout; tot.a += r.adj;
    return `<tr class="${TR}">${first}<td class="${TD} text-center font-mono">${fmtN(r.opening)}</td><td class="${TD} text-center font-mono font-bold text-emerald-700 dark:text-emerald-400">${r.tin ? fmtN(r.tin) : '-'}</td>
      <td class="${TD} text-center font-mono font-bold text-rose-600">${r.tout ? fmtN(r.tout) : '-'}</td>${hasAdj ? `<td class="${TD} text-center font-mono text-amber-700">${r.adj ? fmtN(r.adj) : '-'}</td>` : ''}
      <td class="${TD} text-center font-mono font-black stk-cur bg-cyan-50 dark:bg-cyan-950/30">${fmtN(r.closing)}</td></tr>`;
  }).join('');
  var h5 = `<th class="${TH} w-10">SL</th><th class="${TH}">${L('Code', 'কোড')}</th><th class="${TH} text-left">${L('Product Name', 'প্রোডাক্ট নাম')}</th><th class="${TH}">${L('Pack', 'প্যাক')}</th><th class="${TH}">${L('Unit', 'ইউনিট')}</th>`;
  var label = `<td colspan="5" class="${TF} text-center font-sans">${L('TOTAL', 'মোট')} = ${rows.length} ${L('products', 'প্রোডাক্ট')}</td>`;
  if (life) return table(h5 + `<th class="${TH}">${L('Category', 'ক্যাটাগরি')}</th><th class="${TH} text-center font-black bg-slate-900 stk-cur-h">${L('Current Stock', 'বর্তমান স্টক')}</th><th class="${TH} text-center">${L('Min', 'মিনিমাম')}</th>`,
    body || emptyRow(8), `<tr class="bg-slate-100 dark:bg-slate-800">${label}<td class="${TF}"></td><td class="${TF} text-center stk-cur">${fmtN(tot.c)}</td><td class="${TF}"></td></tr>` + wordsRow(8, tot.c));
  return table(h5 + `<th class="${TH} text-center">${L('Opening', 'ওপেনিং')}</th><th class="${TH} text-center text-emerald-300">${L('IN', 'ইন')}</th><th class="${TH} text-center text-rose-300">${L('OUT', 'আউট')}</th>${hasAdj ? `<th class="${TH} text-center text-amber-200">${L('Adj.', 'সমন্বয়')}</th>` : ''}<th class="${TH} text-center font-black bg-slate-900 stk-cur-h">${L('Closing Stock', 'ক্লোজিং স্টক')}</th>`,
    body || emptyRow(hasAdj ? 10 : 9), `<tr class="bg-slate-100 dark:bg-slate-800">${label}<td class="${TF} text-center">${fmtN(tot.o)}</td><td class="${TF} text-center text-emerald-700">${fmtN(tot.i)}</td><td class="${TF} text-center text-rose-600">${fmtN(tot.x)}</td>${hasAdj ? `<td class="${TF} text-center">${fmtN(tot.a)}</td>` : ''}<td class="${TF} text-center stk-cur">${fmtN(tot.c)}</td></tr>` + wordsRow(hasAdj ? 10 : 9, tot.c));
}
IN['stk-q'] = function (el) { S.stock.q = el.value; document.getElementById('stk-table').innerHTML = stockTableHTML(); };
CH['stk-cat'] = function (el) { S.stock.cat = el.value; renderMain(); };
ACT['stk-filter'] = function (el) { S.stock.filter = el.getAttribute('data-f'); renderMain(); };
ACT['stk-ledger'] = function (el) { openProductHistory(el.getAttribute('data-pid')); };
ACT['stk-csv'] = function () {
  var rows = stockRows() || [], f = stockF();
  if (f.dmode === 'all') return downloadCsv('SCS_Current_Stock_' + today(), ['SL', 'Code', 'Product Name', 'Pack Size', 'Unit', 'Category', 'Current Stock', 'Min Stock', 'Status'],
    rows.map(function (x) { var p = x.p; return [p.order, p.code, p.name, p.pack, p.unit, p.cat, x.stock, p.min, p.status]; }));
  downloadCsv('SCS_Stock_' + periodUpper(f).replace(/\s+/g, '_'), ['SL', 'Code', 'Product Name', 'Pack Size', 'Unit', 'Opening', 'IN', 'OUT', 'Adjustment', 'Closing Stock'],
    rows.map(function (x, i) { var r = x.r; return [i + 1, r.code, r.name, r.pack, r.unit, r.opening, r.tin, r.tout, r.adj, r.closing]; }));
};

/* =====================================================================
 *  3. TRANSACTION HISTORY
 * ===================================================================== */
function histState() {
  if (!S.hist) S.hist = { f: { q: '', productId: '', type: '', user: '', status: 'ACTIVE', dmode: 'date', date: today() }, page: 1, size: 50, data: null, led: null, ledKey: '', users: [], seq: 0 };
  return S.hist;
}
function histParams(all) {
  var h = histState(), f = h.f, p = dateFilterParams(f);
  ['q', 'productId', 'type', 'user'].forEach(function (k) { if (f[k]) p[k] = f[k]; });
  p.status = isAdmin() && S.view === 'history' ? f.status : 'ACTIVE';
  p.page = all ? 1 : h.page; p.size = all ? 0 : h.size;
  return p;
}
/** a product is selected → the page shows that product's full history (opening, every IN / OUT, running balance) */
function histProdMode() { var f = histState().f; return !!f.productId && (f.status === 'ACTIVE' || !isAdmin()); }
function ledgerParams() { var f = histState().f, r = periodRange(f); return { productId: f.productId, from: r.from, to: r.to }; }
VIEW_LOAD.history = function () {
  var h = histState(), my = ++h.seq;
  var paint = function () { if (h.seq !== my || S.view !== 'history') return; var t = document.getElementById('hist-res'); if (t) t.innerHTML = histResultHTML(); else renderMain(); };
  if (histProdMode()) {
    var lp = ledgerParams(), key = JSON.stringify(lp);
    return swr('ledger', lp, function (d) { if (h.seq !== my) return; h.led = d; h.ledKey = key; paint(); }).catch(failToast);
  }
  return swr('queryTransactions', histParams(), function (d) { if (h.seq !== my) return; h.data = d; h.users = d.users; paint(); }).catch(failToast);
};
bindPeriod('hist', function () { return histState().f; }, function () { var h = histState(); h.page = 1; h.data = null; h.led = null; renderMain(); VIEW_LOAD.history(); });
VIEW_RENDER.history = function () {
  var h = histState(), f = h.f, pm = histProdMode(), pp = f.productId ? productById(f.productId) : null;
  var users = h.users && h.users.length ? h.users : (h.led ? Object.keys(h.led.rows.reduce(function (m, x) { m[x.user] = 1; return m; }, {})).sort() : []);
  var tools = periodBar('hist', f, PERIOD_TXN) +
    pickerHTML('hist', f.productId, L('All products — tap to select / search', 'সব প্রোডাক্ট — নির্বাচন / সার্চ করুন')) +
    (f.productId ? `<button type="button" data-act="hist-clearp" title="${L('Show all products', 'সব প্রোডাক্ট দেখান')}" class="p-1.5 rounded-lg text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">${ic('x', 'w-3.5 h-3.5')}</button>` : '') +
    searchBox('data-in="hist-q"', f.q, L('Search Txn ID / remarks / user', 'আইডি / মন্তব্য / ইউজার খুঁজুন')) +
    `<select data-ch="hist-f" data-k="type" class="${SELC}">${opt('', L('All types', 'সব টাইপ'), f.type)}${opt('IN', 'Stock IN', f.type)}${opt('OUT', 'Stock OUT', f.type)}${opt('ADJ', L('Opening', 'ওপেনিং'), f.type)}</select>
    <select data-ch="hist-f" data-k="user" class="${SELC}">${opt('', L('All users', 'সব ইউজার'), f.user)}${users.map(function (u) { return opt(u, u, f.user); }).join('')}</select>
    ${isAdmin() ? `<select data-ch="hist-f" data-k="status" class="${SELC}">${opt('ACTIVE', L('Active', 'সক্রিয়'), f.status)}${opt('DELETED', L('Deleted', 'ডিলিটেড'), f.status)}${opt('ALL', L('All status', 'সব স্ট্যাটাস'), f.status)}</select>` : ''}
    <button type="button" data-act="hist-reset" title="${L('Reset', 'রিসেট')}" class="p-1.5 rounded-lg text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">${ic('rotate-ccw', 'w-3.5 h-3.5')}</button>`;
  var title = pm && pp ? 'PRODUCT HISTORY — ' + pp.code + ' ' + pp.name + (pp.pack ? ' (' + pp.pack + ')' : '') : 'TRANSACTION HISTORY — ' + periodUpper(f);
  return reportShell({ tools: tools, actions: [actPrint(), actCsv('hist-csv')], printTitle: title, subTitle: pm && pp ? periodText(f) : '', body: `<div id="hist-res">${histResultHTML()}</div>` });
};
var PK_ON = {}, PK_GET = {};
PK_ON.hist = function (pid) {
  var h = histState(); h.f.productId = pid;
  if (h.f.dmode === 'date' && h.f.date === today()) setPeriod(h.f, 'all');   // a product's history starts from Lifetime
  h.page = 1; h.data = null; h.led = null; renderMain(); VIEW_LOAD.history();
};
PK_GET.hist = function () { return histState().f.productId; };
ACT['hist-clearp'] = function () { var h = histState(); h.f.productId = ''; h.page = 1; h.data = null; h.led = null; renderMain(); VIEW_LOAD.history(); };
/** one table row's buttons: change history (everyone) • edit • delete — edit / delete ask for the PIN */
function histActCell(x) {
  return `<td class="${TD} no-print whitespace-nowrap text-center"><div class="inline-flex gap-1">
    <button type="button" data-act="tx-hist" data-id="${esc(x.id)}" title="${L('Edit history', 'এডিট হিস্টোরি')}" class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">${ic('history', 'w-3.5 h-3.5')}</button>
    ${x.status !== 'DELETED' && x.type !== 'ADJ' ? `<button type="button" data-act="tx-edit" data-id="${esc(x.id)}" title="${L('Edit (PIN)', 'এডিট (পিন লাগবে)')}" class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer">${ic('pen-line', 'w-3.5 h-3.5')}</button>` : ''}
    ${x.status !== 'DELETED' ? `<button type="button" data-act="tx-del" data-id="${esc(x.id)}" title="${L('Delete (PIN)', 'ডিলিট (পিন লাগবে)')}" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer">${ic('trash-2', 'w-3.5 h-3.5')}</button>` : ''}
  </div></td>`;
}
function histResultHTML() { return histProdMode() ? histProductHTML() : histListHTML(); }
function histProductHTML() {
  var h = histState(), f = h.f, d = h.led;
  if (!d || h.ledKey !== JSON.stringify(ledgerParams())) return loadingBlock();
  var p = d.product, q = f.q.trim().toLowerCase();
  var list = d.rows.filter(function (x) { return (!f.type || x.type === f.type) && (!f.user || x.user === f.user) && (!q || (x.id + ' ' + x.remarks + ' ' + x.user).toLowerCase().indexOf(q) >= 0); });
  var r = periodRange(f);
  var chips = [[L('Product', 'প্রোডাক্ট'), esc(p.code) + ' - ' + esc(p.name) + (p.pack ? ' (' + esc(p.pack) + ')' : '') + (p.unit ? ' • ' + esc(p.unit) : '')], [L('Opening', 'ওপেনিং'), fmtN(d.opening)], ['IN', '<span class="text-emerald-600">' + fmtN(d.tin) + '</span>'], ['OUT', '<span class="text-rose-600">' + fmtN(d.tout) + '</span>'], [L('Closing', 'ক্লোজিং'), '<span class="text-pink-600">' + fmtN(d.closing) + '</span>']].map(function (x) {
    return `<div class="px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"><span class="text-slate-400 font-bold uppercase text-[10px]">${x[0]}:</span> <b class="font-black">${x[1]}</b></div>`;
  }).join('');
  var rows = `<tr class="bg-amber-50/60 dark:bg-amber-950/20"><td colspan="6" class="${TD} font-bold text-right">${L('Opening balance', 'ওপেনিং ব্যালেন্স')}${r.from ? ' (' + fmtD(r.from) + ')' : ''}</td><td class="${TD}"></td><td class="${TD}"></td><td class="${TD} text-right font-mono font-black">${fmtN(d.opening)}</td><td class="${TD} no-print"></td></tr>` +
    list.map(function (x) {
      var qq = x.qty;
      return `<tr class="${TR}"><td class="${TD} whitespace-nowrap">${fmtD(x.date)}</td><td class="${TD} font-mono text-[11px]">${esc(String(x.time).slice(0, 5))}</td><td class="${TD} text-center">${badgeType(x.type)}</td>
        <td class="${TD} font-mono text-[10px] text-slate-500">${esc(x.id)}</td><td class="${TD} text-[11px]">${esc(x.remarks || '')}${x.edits ? ` <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">${L('Edited', 'এডিটেড')} ×${x.edits}</span>` : ''}</td><td class="${TD} whitespace-nowrap">${esc(x.user)}</td>
        <td class="${TD} text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">${x.type === 'IN' || (x.type === 'ADJ' && qq > 0) ? fmtN(Math.abs(qq)) : ''}</td>
        <td class="${TD} text-right font-mono font-bold text-rose-600">${x.type === 'OUT' || (x.type === 'ADJ' && qq < 0) ? fmtN(Math.abs(qq)) : ''}</td>
        <td class="${TD} text-right font-mono font-black bg-cyan-50 dark:bg-cyan-950/30">${fmtN(x.balance)}</td>${histActCell(x)}</tr>`;
    }).join('');
  return `<div class="flex flex-wrap gap-1 mb-1.5 text-[11px]">${chips}</div>` +
    table(`<th class="${TH}">${L('Date', 'তারিখ')}</th><th class="${TH}">${L('Time', 'সময়')}</th><th class="${TH}">${L('Type', 'টাইপ')}</th><th class="${TH}">${L('Txn ID', 'আইডি')}</th><th class="${TH} text-left">${L('Remarks', 'মন্তব্য')}</th><th class="${TH}">${L('User', 'ইউজার')}</th>
      <th class="${TH} text-right text-emerald-300">IN</th><th class="${TH} text-right text-rose-300">OUT</th><th class="${TH} text-right font-black bg-slate-900">${L('Balance', 'ব্যালেন্স')}</th><th class="${TH} no-print w-20"></th>`, rows,
      `<tr class="bg-slate-100 dark:bg-slate-800"><td colspan="6" class="${TF} text-right font-sans">${L('CLOSING BALANCE =', 'ক্লোজিং ব্যালেন্স =')}</td><td class="${TF} text-right text-emerald-700">${fmtN(d.tin + Math.max(0, d.tadj))}</td><td class="${TF} text-right text-rose-600">${fmtN(d.tout + Math.max(0, -d.tadj))}</td><td class="${TF} text-right">${fmtN(d.closing)}</td><td class="${TF} no-print"></td></tr>`);
}
function histListHTML() {
  var h = histState(), d = h.data;
  if (!d) return loadingBlock();
  var rows = d.rows.map(function (x) {
    var del = x.status === 'DELETED';
    return `<tr class="${TR}${del ? ' bg-rose-50/70 dark:bg-rose-950/20' : ''}">
      <td class="${TD} whitespace-nowrap">${fmtD(x.date)}<div class="text-[10px] text-slate-400 font-mono">${esc(String(x.time).slice(0, 5))}</div></td>
      <td class="${TD} text-center">${badgeType(x.type)}</td>
      <td class="${TD}"><span class="font-mono font-bold text-pink-600 dark:text-pink-400">${esc(x.code)}</span> <span class="font-semibold">${esc(x.name)}</span> ${x.pack ? `<span class="text-slate-400">(${esc(x.pack)})</span>` : ''}
        <div class="text-[10px] text-slate-400 font-mono">${esc(x.id)}</div></td>
      <td class="${TD} text-right font-mono font-black ${x.type === 'IN' ? 'text-emerald-700 dark:text-emerald-400' : x.type === 'OUT' ? 'text-rose-600' : 'text-amber-700'}">${fmtN(x.qty)} <span class="font-sans font-semibold text-slate-400">${esc(x.unit)}</span></td>
      <td class="${TD} text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">${fmtN(x.prev)} → <b class="text-slate-800 dark:text-slate-100">${fmtN(x.next)}</b></td>
      <td class="${TD} whitespace-nowrap">${esc(x.user)}</td>
      <td class="${TD} text-[11px] max-w-56">${esc(x.remarks || '')}${x.edits ? `<div><span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">${L('Edited', 'এডিটেড')} ×${x.edits}</span></div>` : ''}
        ${del ? `<div class="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">${L('Deleted by', 'ডিলিট করেছেন')} ${esc(x.deletedBy)} • ${fmtDT(x.deletedAt)} • ${esc(x.reason)}</div>` : ''}</td>
      ${histActCell(x)}</tr>`;
  }).join('');
  return `<div class="flex flex-wrap items-center justify-between gap-1.5 mb-1.5"><div class="flex flex-wrap gap-1">${chip(fmtN(d.total) + ' ' + L('lines', 'লাইন'), 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700')}
      ${chip('IN: ' + fmtN(d.sum.IN), 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800')}${chip('OUT: ' + fmtN(d.sum.OUT), 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800')}
      ${d.sum.ADJ ? chip(L('Opening: ', 'ওপেনিং: ') + fmtN(d.sum.ADJ), 'bg-amber-50 text-amber-800 border-amber-200') : ''}</div>
      <div class="no-print flex items-center gap-1.5">${sizeSel('hist', histState().size)}${pager('hist', d)}</div></div>` +
    table(`<th class="${TH}">${L('Date', 'তারিখ')}</th><th class="${TH}">${L('Type', 'টাইপ')}</th><th class="${TH} text-left">${L('Product / Txn ID', 'প্রোডাক্ট / ট্রানজ্যাকশন আইডি')}</th><th class="${TH} text-right text-amber-200">${L('Qty', 'পরিমাণ')}</th><th class="${TH} text-right">${L('Stock', 'স্টক')}</th><th class="${TH}">${L('User', 'ইউজার')}</th><th class="${TH} text-left">${L('Remarks', 'মন্তব্য')}</th><th class="${TH} no-print"></th>`, rows || emptyRow(8)) +
    (d.pages > 1 ? `<div class="no-print mt-1.5 flex justify-end">${pager('hist', d)}</div>` : '');
}
var histTimer = null;
IN['hist-q'] = function (el) { var h = histState(); h.f.q = el.value; h.page = 1; clearTimeout(histTimer); histTimer = setTimeout(VIEW_LOAD.history, 350); };
CH['hist-f'] = function (el) {
  var h = histState(), k = el.getAttribute('data-k');
  h.f[k] = el.value;
  h.page = 1; h.data = null; renderMain(); VIEW_LOAD.history();
};
CH['hist-size'] = function (el) { var h = histState(); h.size = Number(el.value); h.page = 1; VIEW_LOAD.history(); };
ACT['hist-page'] = function (el) { var h = histState(); h.page = Number(el.getAttribute('data-p')); VIEW_LOAD.history(); };
ACT['hist-reset'] = function () { S.hist = null; renderMain(); VIEW_LOAD.history(); };
ACT['hist-csv'] = function () {
  api('queryTransactions', histParams(true)).then(function (d) {
    downloadCsv('SCS_Transaction_History_' + today(), ['Txn ID', 'Batch', 'Date', 'Time', 'Type', 'Product ID', 'Code', 'Product', 'Pack', 'Unit', 'Quantity', 'Prev Stock', 'New Stock', 'User', 'Remarks', 'Status', 'Edits', 'Deleted By', 'Deleted At', 'Delete Reason'],
      d.rows.map(function (x) { return [x.id, x.batch, x.date, x.time, x.type, x.pid, x.code, x.name, x.pack, x.unit, x.qty, x.prev, x.next, x.user, x.remarks, x.status, x.edits, x.deletedBy, x.deletedAt, x.reason]; }));
  }).catch(failToast);
};
function histRow(id) {
  var h = histState(), r = h.data ? h.data.rows.filter(function (x) { return x.id === id; })[0] : null;
  return r || (h.led ? h.led.rows.filter(function (x) { return x.id === id; })[0] : null) || null;
}
ACT['tx-hist'] = function (el) {
  api('txnHistory', { id: el.getAttribute('data-id') }).then(function (r) {
    var t = r.txn;
    var body = `<div class="space-y-3 text-xs"><div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-1.5">
      <div><b>${L('Txn ID', 'আইডি')}:</b> <span class="font-mono">${esc(t.id)}</span></div><div><b>${L('Type', 'টাইপ')}:</b> ${badgeType(t.type)}</div>
      <div class="col-span-2"><b>${L('Product', 'প্রোডাক্ট')}:</b> ${esc(t.code)} - ${esc(t.name)} ${esc(t.pack)}</div>
      <div><b>${L('Qty', 'পরিমাণ')}:</b> ${fmtN(t.qty)} ${esc(t.unit)}</div><div><b>${L('Date', 'তারিখ')}:</b> ${fmtD(t.date)} ${esc(t.time)}</div>
      <div><b>${L('Entered by', 'এন্ট্রি')}:</b> ${esc(t.user)}</div><div><b>${L('Created', 'তৈরি')}:</b> ${fmtDT(t.created)}</div></div>
      <h4 class="font-bold text-slate-700 dark:text-slate-200">${L('Change history', 'পরিবর্তনের ইতিহাস')}</h4>
      ${r.logs.length ? `<ol class="relative border-l-2 border-pink-200 dark:border-pink-900 ml-2 space-y-3">${r.logs.map(function (l) {
        return `<li class="ml-4"><div class="absolute -left-[7px] mt-1 w-3 h-3 rounded-full bg-pink-600"></div><div class="font-bold">${actionLabel(l.action)} <span class="text-slate-400 font-normal">• ${fmtDT(l.ts)} • ${esc(l.user)}</span></div>
          <div class="text-slate-600 dark:text-slate-300">${esc(l.summary)}</div>${diffHTML(l)}</li>`;
      }).join('')}</ol>` : `<p class="text-slate-400">${L('No changes recorded.', 'কোনো পরিবর্তন নেই।')}</p>`}</div>`;
    openModal({ id: 'txhist', title: L('Transaction History', 'ট্রানজ্যাকশন হিস্টোরি'), icon: 'history', body: body, size: 'max-w-2xl', foot: btn('OK', 'modal-close', 'primary', '', 'data-id="txhist"') });
  }).catch(failToast);
};
ACT['tx-edit'] = function (el) {
  var x = histRow(el.getAttribute('data-id')); if (!x) return;
  var body = `<div class="space-y-3"><div class="text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">${badgeType(x.type)} <b class="ml-1">${esc(x.code)} - ${esc(x.name)}</b> ${esc(x.pack)} <div class="text-slate-400 font-mono mt-1">${esc(x.id)}</div></div>
    <div class="grid grid-cols-2 gap-3">${field(L('Quantity', 'পরিমাণ') + ' (' + esc(x.unit) + ')', `<input type="number" step="any" min="0" id="te-qty" value="${x.qty}" class="${INP} font-mono font-bold" autofocus>`)}
    ${field(L('Date', 'তারিখ'), `<input type="date" id="te-date" max="${today()}" value="${esc(x.date)}" class="${INP}">`)}</div>
    ${field(L('Remarks', 'মন্তব্য'), `<input type="text" id="te-remarks" maxlength="300" value="${esc(x.remarks)}" class="${INP}">`)}
    ${field(L('Reason for edit (required)', 'এডিটের কারণ (আবশ্যক)'), `<textarea id="te-reason" rows="2" class="${INP}"></textarea>`)}
    <p class="text-[11px] text-slate-500">${L('The old and new values are saved in the Activity Log (edit history).', 'পুরোনো ও নতুন মান Activity Log-এ (এডিট হিস্টোরি) সংরক্ষিত থাকবে।')}</p></div>`;
  openModal({ id: 'txedit', title: L('Edit Transaction', 'ট্রানজ্যাকশন এডিট'), icon: 'pen-line', body: body, size: 'max-w-md',
    foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="txedit"') + btn(L('Save Changes', 'পরিবর্তন সেভ'), 'tx-edit-save', 'primary', 'save', 'data-id="' + esc(x.id) + '"') });
};
ACT['tx-edit-save'] = function (el) {
  var reason = val('te-reason').trim();
  if (!reason) return toast(L('Please write the reason.', 'কারণ লিখুন।'), 'error');
  var d = { id: el.getAttribute('data-id'), qty: Number(val('te-qty')), date: val('te-date'), remarks: val('te-remarks'), reason: reason };
  if (!(d.qty > 0)) return toast(L('Quantity must be greater than 0.', 'পরিমাণ ০-এর বেশি দিন।'), 'error');
  withPin(function (pin) { d.authPin = pin; return api('txnUpdate', d, { silent: true }); }, function (r) {
    CACHE = {}; setBoot(r.boot); closeModal('txedit'); toast(L('Transaction updated.', 'ট্রানজ্যাকশন আপডেট হয়েছে।'), 'success'); VIEW_LOAD.history();
  });
};
ACT['tx-del'] = function (el) {
  var x = histRow(el.getAttribute('data-id')); if (!x) return;
  confirmBox({ title: L('Delete Transaction', 'ট্রানজ্যাকশন ডিলিট'), danger: true, reason: true, okText: L('Delete', 'ডিলিট'),
    message: `<b>${esc(x.type)} ${esc(x.code)} - ${esc(x.name)} × ${fmtN(x.qty)}</b> (${fmtD(x.date)})<br>${L('Stock will be recalculated. The record is kept in Admin → Deleted Records and can be restored there.', 'স্টক আবার হিসাব হবে। রেকর্ডটি Admin → Deleted Records-এ থাকবে, সেখান থেকে Restore করা যাবে।')}`,
    onOk: function (reason) {
      withPin(function (pin) { return api('txnDelete', { ids: [x.id], reason: reason, authPin: pin }, { silent: true }); }, function (r) {
        CACHE = {}; setBoot(r.boot); toast(L('Transaction deleted.', 'ট্রানজ্যাকশন ডিলিট হয়েছে।'), 'success'); VIEW_LOAD.history();
      });
    } });
};



/* ---------- searchable product picker (select from list + search) ---------- */
var PK = null;   // {key, list, idx}
function pickerHTML(key, pid, ph) {
  var p = pid ? productById(pid) : null;
  return `<div class="relative flex-1 min-w-52 sm:max-w-md"><input type="text" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" data-in="pk" data-kd="pk" data-pk="${key}" id="pk-${key}" value="${esc(p ? prodLabel(p) : '')}" placeholder="${esc(ph)}" class="scs-inp ${INP} pl-8 pr-7 font-semibold">
    ${ic('search', 'w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none')}${ic('chevrons-up-down', 'w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none')}<div id="pkl-${key}"></div></div>`;
}
function pkFilter(text) {
  var q = String(text || '').trim().toLowerCase(), list = products();
  if (q) { var w = q.split(/\s+/); list = list.filter(function (p) { var h = (p.code + ' ' + p.name + ' ' + p.pack + ' ' + p.cat + ' ' + p.unit).toLowerCase(); return w.every(function (x) { return h.indexOf(x) >= 0; }); }); }
  return list.slice(0, 60);
}
function pkShow(key, text) {
  var box = document.getElementById('pkl-' + key); if (!box) return;
  var list = pkFilter(text);
  PK = { key: key, text: text, list: list, idx: PK && PK.key === key ? Math.max(0, Math.min(PK.idx, list.length - 1)) : 0 };
  if (!list.length) { box.innerHTML = `<div class="absolute left-0 right-0 top-full z-30 mt-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl p-2.5 text-xs text-slate-400">${L('No product matches', 'কোনো প্রোডাক্ট মেলেনি')}</div>`; return; }
  box.innerHTML = `<div class="scs-drop absolute left-0 right-0 top-full z-30 mt-0.5 overflow-y-auto overscroll-contain rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl custom-scrollbar">${list.map(function (p, i) {
    return `<button type="button" onmousedown="event.preventDefault()" data-act="pk-pick" data-pk="${key}" data-pid="${esc(p.id)}" class="w-full text-left px-2.5 py-2 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 cursor-pointer ${i === PK.idx ? 'bg-pink-50 dark:bg-slate-700' : 'hover:bg-slate-50 dark:hover:bg-slate-700/60'}">
      <span class="text-sm leading-tight"><span class="font-mono font-bold text-pink-600 dark:text-pink-400">${esc(p.code)}</span> <span class="font-semibold text-slate-800 dark:text-slate-100">${esc(p.name)}</span> ${p.pack ? `<span class="text-slate-400">(${esc(p.pack)})</span>` : ''}${p.status !== 'ACTIVE' ? ` <span class="text-[10px] text-slate-400">• ${L('Inactive', 'নিষ্ক্রিয়')}</span>` : ''}</span>
      <span class="text-[11px] font-mono font-bold shrink-0 text-slate-500">${fmtN(p.stock)} ${esc(p.unit)}</span></button>`;
  }).join('')}</div>`;
  fitDrop(document.getElementById('pk-' + key), box);
  var lst = box.firstElementChild, act = lst && lst.children[PK.idx];
  if (act && (act.offsetTop < lst.scrollTop || act.offsetTop + act.offsetHeight > lst.scrollTop + lst.clientHeight)) lst.scrollTop = act.offsetTop - 4;
}
function pkHide() { $$('[id^="pkl-"]').forEach(function (b) { b.innerHTML = ''; }); PK = null; }
document.addEventListener('click', function (e) {
  var el = e.target && e.target.closest && e.target.closest('[data-in="pk"]');
  if (!el) return;
  var key = el.getAttribute('data-pk');
  if (PK && PK.key === key) return;
  el.select(); pkShow(key, '');   // tap = full list; typing filters
});
document.addEventListener('focusout', function (e) {
  if (e.target && e.target.getAttribute && e.target.getAttribute('data-in') === 'pk') setTimeout(function () {
    var a = document.activeElement; if (a && a.getAttribute && a.getAttribute('data-in') === 'pk') return;
    var key = e.target.getAttribute('data-pk'); pkHide();
    var inp = document.getElementById('pk-' + key), p = productById(PK_GET[key] ? PK_GET[key]() : '');   // restore the selected product name
    if (inp) inp.value = p ? prodLabel(p) : '';
  }, 150);
});
if (window.visualViewport) window.visualViewport.addEventListener('resize', function () { if (PK) fitDrop(document.getElementById('pk-' + PK.key), document.getElementById('pkl-' + PK.key)); });
IN['pk'] = function (el) { if (PK) PK.idx = 0; pkShow(el.getAttribute('data-pk'), el.value); };
KD['pk'] = function (el, e) {
  var key = el.getAttribute('data-pk');
  if (!PK || PK.key !== key || !PK.list.length) { if (e.key === 'ArrowDown') { e.preventDefault(); pkShow(key, ''); } return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); PK.idx = (PK.idx + (e.key === 'ArrowDown' ? 1 : -1) + PK.list.length) % PK.list.length; pkShow(key, PK.text); }
  else if (e.key === 'Enter') { e.preventDefault(); var pid = PK.list[PK.idx].id; pkHide(); el.blur(); if (PK_ON[key]) PK_ON[key](pid); }
  else if (e.key === 'Escape') { pkHide(); el.blur(); }
};
ACT['pk-pick'] = function (el) { var key = el.getAttribute('data-pk'), pid = el.getAttribute('data-pid'); pkHide(); var i = document.getElementById('pk-' + key); if (i) i.blur(); if (PK_ON[key]) PK_ON[key](pid); };

/* =====================================================================
 *  ACTIVITY LOG (Settings icon) — everyone can view, only Admin can delete
 * ===================================================================== */
var ACTIONS_UI = {
  EQUIP_IN: ['Equip IN', 'ইকুইপমেন্ট ইন', 'bg-emerald-100 text-emerald-800 border-emerald-300'], EQUIP_OUT: ['Equip OUT', 'ইকুইপমেন্ট আউট', 'bg-rose-100 text-rose-800 border-rose-300'],
  EQUIP_DAMAGE: ['Equip Damage', 'ইকুইপমেন্ট ড্যামেজ', 'bg-amber-100 text-amber-800 border-amber-300'], EQUIP_REPAIRED: ['Equip Repaired', 'ইকুইপমেন্ট ঠিক হয়েছে', 'bg-sky-100 text-sky-800 border-sky-300'],
  EQUIP_ADD: ['Equip Added', 'ইকুইপমেন্ট যোগ', 'bg-sky-100 text-sky-800 border-sky-300'], EQUIP_EDIT: ['Equip Edited', 'ইকুইপমেন্ট এডিট', 'bg-amber-100 text-amber-800 border-amber-300'],
  EQUIP_STATUS: ['Equip Status', 'ইকুইপমেন্ট স্ট্যাটাস', 'bg-slate-100 text-slate-700 border-slate-300'], EQUIP_DELETE: ['Equip Deleted', 'ইকুইপমেন্ট ডিলিট', 'bg-rose-100 text-rose-800 border-rose-300'],
  EQUIP_RESTORE: ['Equip Restored', 'ইকুইপমেন্ট রিস্টোর', 'bg-emerald-100 text-emerald-800 border-emerald-300'], EQUIP_PURGE: ['Equip Purged', 'ইকুইপমেন্ট স্থায়ী ডিলিট', 'bg-red-200 text-red-900 border-red-400'],
  EQTXN_EDIT: ['Equip Entry Edited', 'ইকুইপমেন্ট এন্ট্রি এডিট', 'bg-amber-100 text-amber-800 border-amber-300'], EQTXN_DELETE: ['Equip Entry Deleted', 'ইকুইপমেন্ট এন্ট্রি ডিলিট', 'bg-rose-100 text-rose-800 border-rose-300'],
  EQTXN_RESTORE: ['Equip Entry Restored', 'ইকুইপমেন্ট এন্ট্রি রিস্টোর', 'bg-emerald-100 text-emerald-800 border-emerald-300'], EQTXN_PURGE: ['Equip Entry Purged', 'ইকুইপমেন্ট এন্ট্রি স্থায়ী ডিলিট', 'bg-red-200 text-red-900 border-red-400'],
  LOGIN: ['Login', 'লগইন', 'bg-slate-100 text-slate-700 border-slate-300'], LOGOUT: ['Logout', 'লগআউট', 'bg-slate-100 text-slate-700 border-slate-300'],
  ADMIN_LOGIN: ['Admin Login', 'অ্যাডমিন লগইন', 'bg-indigo-100 text-indigo-800 border-indigo-300'], ADMIN_PIN_FAILED: ['Wrong Admin PIN', 'ভুল অ্যাডমিন পিন', 'bg-rose-100 text-rose-800 border-rose-300'],
  STOCK_IN: ['Stock IN', 'স্টক ইন', 'bg-emerald-100 text-emerald-800 border-emerald-300'], STOCK_OUT: ['Stock OUT', 'স্টক আউট', 'bg-rose-100 text-rose-800 border-rose-300'],
  TXN_EDIT: ['Txn Edited', 'ট্রানজ্যাকশন এডিট', 'bg-amber-100 text-amber-800 border-amber-300'], TXN_DELETE: ['Txn Deleted', 'ট্রানজ্যাকশন ডিলিট', 'bg-rose-100 text-rose-800 border-rose-300'],
  TXN_RESTORE: ['Txn Restored', 'ট্রানজ্যাকশন রিস্টোর', 'bg-emerald-100 text-emerald-800 border-emerald-300'], TXN_PURGE: ['Txn Purged', 'ট্রানজ্যাকশন স্থায়ী ডিলিট', 'bg-red-200 text-red-900 border-red-400'],
  PRODUCT_ADD: ['Product Added', 'প্রোডাক্ট যোগ', 'bg-sky-100 text-sky-800 border-sky-300'], PRODUCT_EDIT: ['Product Edited', 'প্রোডাক্ট এডিট', 'bg-amber-100 text-amber-800 border-amber-300'],
  PRODUCT_STATUS: ['Product Status', 'প্রোডাক্ট স্ট্যাটাস', 'bg-slate-100 text-slate-700 border-slate-300'], PRODUCT_REORDER: ['Product Order', 'প্রোডাক্ট ক্রম', 'bg-slate-100 text-slate-700 border-slate-300'],
  PRODUCT_DELETE: ['Product Deleted', 'প্রোডাক্ট ডিলিট', 'bg-rose-100 text-rose-800 border-rose-300'], PRODUCT_RESTORE: ['Product Restored', 'প্রোডাক্ট রিস্টোর', 'bg-emerald-100 text-emerald-800 border-emerald-300'],
  PRODUCT_PURGE: ['Product Purged', 'প্রোডাক্ট স্থায়ী ডিলিট', 'bg-red-200 text-red-900 border-red-400'],
  LOG_DELETE: ['Log Deleted', 'লগ ডিলিট', 'bg-rose-100 text-rose-800 border-rose-300'], LOG_RESTORE: ['Log Restored', 'লগ রিস্টোর', 'bg-emerald-100 text-emerald-800 border-emerald-300'], LOG_PURGE: ['Log Purged', 'লগ স্থায়ী ডিলিট', 'bg-red-200 text-red-900 border-red-400'],
  USER_ADD: ['User Added', 'ইউজার যোগ', 'bg-sky-100 text-sky-800 border-sky-300'], USER_EDIT: ['User Edited', 'ইউজার এডিট', 'bg-amber-100 text-amber-800 border-amber-300'], USER_DELETE: ['User Deleted', 'ইউজার ডিলিট', 'bg-rose-100 text-rose-800 border-rose-300'],
  SETTINGS_UPDATE: ['Settings', 'সেটিংস', 'bg-slate-100 text-slate-700 border-slate-300'], DRIVE_FOLDER: ['Drive Folder', 'ড্রাইভ ফোল্ডার', 'bg-slate-100 text-slate-700 border-slate-300'], LOGO: ['Logo', 'লোগো', 'bg-slate-100 text-slate-700 border-slate-300'],
  BACKUP_CONFIG: ['Backup Settings', 'ব্যাকআপ সেটিংস', 'bg-indigo-100 text-indigo-800 border-indigo-300'], EXPORT_JSON: ['JSON Export', 'JSON এক্সপোর্ট', 'bg-indigo-100 text-indigo-800 border-indigo-300'],
  IMPORT_JSON: ['JSON Restore', 'JSON রিস্টোর', 'bg-purple-100 text-purple-800 border-purple-300'], LEGACY_IMPORT: ['Old Data Import', 'পুরোনো ডাটা ইমপোর্ট', 'bg-purple-100 text-purple-800 border-purple-300'], DB_REPAIR: ['DB Repair', 'ডাটাবেজ রিপেয়ার', 'bg-slate-100 text-slate-700 border-slate-300'],
  RESET_ALL: ['System Reset', 'সিস্টেম রিসেট', 'bg-red-200 text-red-900 border-red-400'], PIN_FAILED: ['Wrong PIN', 'ভুল পিন', 'bg-amber-100 text-amber-800 border-amber-300'],
  ADMIN_PIN_RESET: ['Admin PIN Reset', 'অ্যাডমিন পিন রিসেট', 'bg-amber-100 text-amber-800 border-amber-300']
};
function actionLabel(a) { var x = ACTIONS_UI[a]; return x ? L(x[0], x[1]) : a; }
function actionBadge(a) { var x = ACTIONS_UI[a] || ['', '', 'bg-slate-100 text-slate-700 border-slate-300']; return `<span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${x[2]}">${esc(actionLabel(a))}</span>`; }
function diffHTML(l) {
  var o = null, n = null;
  try { o = l.oldV ? JSON.parse(l.oldV) : null; } catch (e) {}
  try { n = l.newV ? JSON.parse(l.newV) : null; } catch (e) {}
  if (!o && !n) return '';
  if (o && n && !Array.isArray(o) && !Array.isArray(n) && typeof o === 'object' && typeof n === 'object') {
    var keys = Object.keys(Object.assign({}, o, n)).filter(function (k) { return JSON.stringify(o[k]) !== JSON.stringify(n[k]); });
    if (!keys.length) return '';
    return `<table class="mt-1.5 w-full text-[11px] border border-slate-200 dark:border-slate-700 rounded"><tr class="bg-slate-100 dark:bg-slate-800"><th class="px-2 py-1 text-left">${L('Field', 'ফিল্ড')}</th><th class="px-2 py-1 text-left text-rose-600">${L('Old', 'পুরোনো')}</th><th class="px-2 py-1 text-left text-emerald-600">${L('New', 'নতুন')}</th></tr>${keys.map(function (k) {
      return `<tr class="border-t border-slate-200 dark:border-slate-700"><td class="px-2 py-1 font-bold">${esc(k)}</td><td class="px-2 py-1 font-mono break-all">${esc(typeof o[k] === 'object' ? JSON.stringify(o[k]) : o[k])}</td><td class="px-2 py-1 font-mono break-all">${esc(typeof n[k] === 'object' ? JSON.stringify(n[k]) : n[k])}</td></tr>`;
    }).join('')}</table>`;
  }
  var pre = function (label, v) { return v ? `<div class="mt-1.5"><div class="text-[10px] font-bold text-slate-400 uppercase">${label}</div><pre class="text-[10px] font-mono whitespace-pre-wrap break-all p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 max-h-48 overflow-auto">${esc(JSON.stringify(v, null, 1))}</pre></div>` : ''; };
  return pre(L('Old value', 'পুরোনো মান'), o) + pre(L('New value', 'নতুন মান'), n);
}
/** Admin panel is open (unlocked with the Admin PIN) */
function inAdmin() { return S.view === 'admin' && S.adminOn; }
function logState() {
  if (!S.logs) S.logs = { f: { q: '', action: '', user: '', status: 'ACTIVE', dmode: 'all' }, page: 1, size: 50, data: null, sel: {} };
  return S.logs;
}
function logParams(all) {
  var g = logState(), f = g.f, p = dateFilterParams(f);
  ['q', 'action', 'user'].forEach(function (k) { if (f[k]) p[k] = f[k]; });
  p.status = inAdmin() ? f.status : 'ACTIVE'; p.page = all ? 1 : g.page; p.size = all ? 0 : g.size;
  return p;
}
VIEW_LOAD.logs = function () {
  var g = logState();
  return swr('queryLogs', logParams(), function (d) { g.data = d; g.sel = {}; var t = document.getElementById('log-res'); if (t) t.innerHTML = logResultHTML(); else if (S.view === 'logs') renderMain(); }).catch(failToast);
};
bindPeriod('log', function () { return logState().f; }, function () { var g = logState(); g.page = 1; g.data = null; renderMain(); VIEW_LOAD.logs(); });
function logTools() {
  var g = logState(), f = g.f, d = g.data;
  return periodBar('log', f, PERIOD_TXN) +
    searchBox('data-in="log-q"', f.q, L('Search summary / ID / user', 'বিবরণ / আইডি / ইউজার খুঁজুন')) +
    `<select data-ch="log-f" data-k="action" class="${SELC}">${opt('', L('All actions', 'সব কাজ'), f.action)}${(d ? d.actions : []).map(function (a) { return opt(a, actionLabel(a), f.action); }).join('')}</select>
    <select data-ch="log-f" data-k="user" class="${SELC}">${opt('', L('All users', 'সব ইউজার'), f.user)}${(d ? d.users : []).map(function (u) { return opt(u, u, f.user); }).join('')}</select>
    ${inAdmin() ? `<select data-ch="log-f" data-k="status" class="${SELC}">${opt('ACTIVE', L('Active', 'সক্রিয়'), f.status)}${opt('DELETED', L('Deleted', 'ডিলিটেড'), f.status)}${opt('ALL', L('All status', 'সব স্ট্যাটাস'), f.status)}</select>` : ''}
    <button type="button" data-act="log-reset" title="${L('Reset', 'রিসেট')}" class="p-1.5 rounded-lg text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">${ic('rotate-ccw', 'w-3.5 h-3.5')}</button>`;
}
VIEW_RENDER.logs = function () {
  return reportShell({ tools: logTools(), actions: [actPrint(), actCsv('log-csv')], printTitle: 'ACTIVITY LOG — ' + periodUpper(logState().f), body: `<div id="log-res">${logResultHTML()}</div>` });
};
function logResultHTML() {
  var g = logState(), d = g.data, adm = inAdmin();
  if (!d) return loadingBlock();
  var nSel = Object.keys(g.sel).length;
  var rows = d.rows.map(function (x) {
    var del = x.status === 'DELETED';
    return `<tr class="${TR}${del ? ' bg-rose-50/70 dark:bg-rose-950/20' : ''}">
      ${adm ? `<td class="${TD} text-center no-print">${del ? '' : `<input type="checkbox" data-ch="log-sel" data-id="${esc(x.id)}" ${g.sel[x.id] ? 'checked' : ''} class="w-4 h-4 accent-pink-600 cursor-pointer">`}</td>` : ''}
      <td class="${TD} whitespace-nowrap">${fmtD(x.ts)}<div class="text-[10px] text-slate-400 font-mono">${esc(String(x.ts).slice(11, 19))}</div></td>
      <td class="${TD} whitespace-nowrap font-semibold">${esc(x.user)}<div class="text-[10px] text-slate-400">${esc(x.role)}</div></td>
      <td class="${TD} text-center">${actionBadge(x.action)}</td>
      <td class="${TD} text-[11px]">${esc(x.summary)}${del ? `<div class="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">${L('Deleted by', 'ডিলিট করেছেন')} ${esc(x.deletedBy)} • ${fmtDT(x.deletedAt)} • ${esc(x.reason)}</div>` : ''}</td>
      <td class="${TD} text-center no-print">${(x.oldV || x.newV) ? `<button type="button" data-act="log-view" data-id="${esc(x.id)}" class="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer" title="${L('Details', 'বিস্তারিত')}">${ic('eye', 'w-3.5 h-3.5')}</button>` : ''}</td></tr>`;
  }).join('');
  return `<div class="flex flex-wrap items-center justify-between gap-1.5 mb-1.5"><div class="flex items-center gap-1.5">${chip(fmtN(d.total) + ' ' + L('logs', 'টি লগ'), 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700')}
      ${adm ? `<button type="button" data-act="log-del" ${nSel ? '' : 'disabled'} class="no-print inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:pointer-events-none cursor-pointer">${ic('trash-2', 'w-3.5 h-3.5')}${L('Delete selected', 'নির্বাচিত ডিলিট')} (${nSel})</button>` : ''}</div>
      <div class="no-print flex items-center gap-1.5">${sizeSel('log', g.size)}${pager('log', d)}</div></div>` +
    table((adm ? `<th class="${TH} w-8 no-print"><input type="checkbox" data-ch="log-all" class="w-4 h-4 accent-pink-600 cursor-pointer"></th>` : '') + `<th class="${TH}">${L('Time', 'সময়')}</th><th class="${TH}">${L('User', 'ইউজার')}</th><th class="${TH}">${L('Action', 'কাজ')}</th><th class="${TH} text-left">${L('Details', 'বিবরণ')}</th><th class="${TH} no-print"></th>`, rows || emptyRow(adm ? 6 : 5)) +
    (d.pages > 1 ? `<div class="no-print mt-1.5 flex justify-end">${pager('log', d)}</div>` : '');
}
var logTimer = null;
IN['log-q'] = function (el) { var g = logState(); g.f.q = el.value; g.page = 1; clearTimeout(logTimer); logTimer = setTimeout(VIEW_LOAD.logs, 350); };
CH['log-f'] = function (el) {
  var g = logState(), k = el.getAttribute('data-k');
  g.f[k] = el.value;
  g.page = 1; g.data = null; renderMain(); VIEW_LOAD.logs();
};
CH['log-size'] = function (el) { var g = logState(); g.size = Number(el.value); g.page = 1; VIEW_LOAD.logs(); };
ACT['log-page'] = function (el) { logState().page = Number(el.getAttribute('data-p')); VIEW_LOAD.logs(); };
ACT['log-reset'] = function () { S.logs = null; renderMain(); VIEW_LOAD.logs(); };
CH['log-sel'] = function (el) { var g = logState(), id = el.getAttribute('data-id'); if (el.checked) g.sel[id] = 1; else delete g.sel[id]; document.getElementById('log-res').innerHTML = logResultHTML(); };
CH['log-all'] = function (el) { var g = logState(); g.sel = {}; if (el.checked) g.data.rows.forEach(function (x) { if (x.status !== 'DELETED') g.sel[x.id] = 1; }); document.getElementById('log-res').innerHTML = logResultHTML(); };
ACT['log-view'] = function (el) {
  var x = logState().data.rows.filter(function (r) { return r.id === el.getAttribute('data-id'); })[0]; if (!x) return;
  openModal({ id: 'logview', title: actionLabel(x.action), sub: fmtDT(x.ts) + ' • ' + esc(x.user), icon: 'scroll-text', size: 'max-w-2xl',
    body: `<div class="text-xs space-y-2"><p>${esc(x.summary)}</p><p class="text-slate-400 font-mono">${esc(x.id)} ${x.eid ? '• ' + esc(x.entity) + ': ' + esc(x.eid) : ''}</p>${diffHTML(x)}</div>`, foot: btn('OK', 'modal-close', 'primary', '', 'data-id="logview"') });
};
ACT['log-del'] = function () {
  var ids = Object.keys(logState().sel); if (!ids.length) return;
  confirmBox({ title: L('Delete Activity Logs', 'অ্যাক্টিভিটি লগ ডিলিট'), danger: true, reason: true, okText: L('Move to Deleted Records', 'Deleted Records-এ পাঠান'),
    message: ids.length + L(' log(s) will be moved to Admin → Deleted Records (soft delete). Who, when and why will be saved.', 'টি লগ Admin → Deleted Records-এ যাবে (Soft Delete)। কে, কখন ও কেন ডিলিট করেছে তা সংরক্ষিত থাকবে।'),
    onOk: function (reason) {
      withPin(function (pin) { return api('logDelete', { ids: ids, reason: reason, authPin: pin }, { silent: true }); }, function (r) { CACHE = {}; toast(r.deleted + L(' log(s) deleted.', 'টি লগ ডিলিট হয়েছে।'), 'success'); VIEW_LOAD.logs(); });
    } });
};
ACT['log-csv'] = function () {
  api('queryLogs', logParams(true)).then(function (d) {
    downloadCsv('SCS_Activity_Log_' + today(), ['Log ID', 'Timestamp', 'User', 'Role', 'Action', 'Entity', 'Entity ID', 'Summary', 'Old Value', 'New Value', 'Status', 'Deleted By', 'Deleted At', 'Delete Reason'],
      d.rows.map(function (x) { return [x.id, x.ts, x.user, x.role, x.action, x.entity, x.eid, x.summary, x.oldV, x.newV, x.status, x.deletedBy, x.deletedAt, x.reason]; }));
  }).catch(failToast);
};


/* =====================================================================
 *  ADMIN PANEL — grouped sub-menus (each function lives in one place)
 *   Products: Product List • Categories & Units
 *   Users & PIN
 *   Records: Activity Log • Deleted Records
 *   Backup: Google Drive Backup • JSON Export / Import
 *   Settings: Store & Logo • Old Data Import • System Info
 * ===================================================================== */
var ADMIN_GROUPS = [
  { id: 'products', en: 'Products', bn: 'প্রোডাক্ট', icon: 'package', subs: [['list', 'Product List', 'প্রোডাক্ট তালিকা'], ['catunit', 'Categories & Units', 'ক্যাটাগরি ও ইউনিট']] },
  { id: 'equipment', en: 'Equipment', bn: 'ইকুইপমেন্ট', icon: 'wrench', subs: [] },
  { id: 'users', en: 'Users & PIN', bn: 'ইউজার ও পিন', icon: 'users', subs: [] },
  { id: 'records', en: 'Records', bn: 'রেকর্ড', icon: 'archive-restore', subs: [['logs', 'Activity Log', 'অ্যাক্টিভিটি লগ'], ['deleted', 'Deleted Records', 'ডিলিটেড রেকর্ড']] },
  { id: 'backup', en: 'Backup', bn: 'ব্যাকআপ', icon: 'database', subs: [['drive', 'Google Drive Backup', 'গুগল ড্রাইভ ব্যাকআপ'], ['json', 'JSON Export / Import', 'JSON এক্সপোর্ট / ইমপোর্ট'], ['reset', 'Reset System', 'সিস্টেম রিসেট']] },
  { id: 'settings', en: 'Settings', bn: 'সেটিংস', icon: 'sliders-horizontal', subs: [['store', 'Store, Logo & Drive', 'স্টোর, লোগো ও ড্রাইভ'], ['system', 'System Info', 'সিস্টেম তথ্য']] }
];
(function () {   // old saved tab names → new groups
  var map = { deleted: ['records', 'deleted'], system: ['settings', 'store'] };
  S.adminSub = {};
  try { S.adminSub = JSON.parse(LS.get('scs_store_admin_sub', '{}')) || {}; } catch (e) { S.adminSub = {}; }
  if (map[S.adminTab]) { S.adminSub[map[S.adminTab][0]] = map[S.adminTab][1]; S.adminTab = map[S.adminTab][0]; }
  if (!ADMIN_GROUPS.some(function (g) { return g.id === S.adminTab; })) S.adminTab = 'products';
})();
function adminGroup() { return ADMIN_GROUPS.filter(function (g) { return g.id === S.adminTab; })[0] || ADMIN_GROUPS[0]; }
function adminSub() { var g = adminGroup(); if (!g.subs.length) return ''; var s = S.adminSub[g.id]; return g.subs.some(function (x) { return x[0] === s; }) ? s : g.subs[0][0]; }
function adminKey() { var s = adminSub(); return S.adminTab + (s ? '/' + s : ''); }
var A = S.admin;
function card(title, sub, inner, extraCls) {
  return `<div class="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 ${extraCls || ''}">${title ? `<div class="text-xs font-bold mb-1.5 text-slate-800 dark:text-slate-100">${title}</div>` : ''}${sub ? `<p class="text-[11px] text-slate-500 mb-2">${sub}</p>` : ''}${inner}</div>`;
}

VIEW_LOAD.admin = function (silent) {
  if (!S.adminOn) return;
  var k = adminKey();
  if (k === 'equipment') return eqLoad();
  if (k === 'users') return api('usersList', {}, { silent: true }).then(function (d) { A.users = d; adminRefresh(); }).catch(failToast);
  if (k === 'records/deleted') return api('deletedRecords', {}, { silent: true }).then(function (d) { A.deleted = d; A.delSel = {}; adminRefresh(); }).catch(failToast);
  if (k === 'records/logs') return VIEW_LOAD.logs();
  if (k === 'backup/drive' || k === 'backup/json') return api('backupConfig', {}, { silent: true }).then(function (d) { A.backup = d; adminRefresh(); }).catch(failToast);
  if (k === 'settings/system') return api('systemInfo', {}, { silent: true }).then(function (d) { A.sys = d; adminRefresh(); }).catch(failToast);
};
/** protected call: asks the PIN (Admin PIN inside Admin), then calls the server — the PIN is checked there */
function pinApi(action, data, done) {
  withPin(function (pin) { return api(action, Object.assign({}, data, { authPin: pin }), { silent: true }); }, function (r) { CACHE = {}; done(r); });
}
function adminRefresh() { if (S.view === 'admin') softRender(); }

VIEW_RENDER.admin = function () {
  if (!S.adminOn) return `<div class="py-16 text-center text-sm text-slate-500">${L('Admin access required.', 'অ্যাডমিন অ্যাক্সেস প্রয়োজন।')}</div>`;
  var ad = S.boot.admin || {}, g = adminGroup(), sub = adminSub();
  var banner = '';
  var groups = ADMIN_GROUPS.map(function (x) {
    var a = x.id === g.id;
    return `<button type="button" data-act="adm-tab" data-t="${x.id}" class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-all ${a ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'}">${ic(x.icon, 'w-3.5 h-3.5')}<span>${L(x.en, x.bn)}</span></button>`;
  }).join('');
  var subs = g.subs.length ? `<div class="scs-nav-scroll flex items-center gap-0.5 border-b border-slate-200 dark:border-slate-800">${g.subs.map(function (x) {
    var a = x[0] === sub;
    return `<button type="button" data-act="adm-sub" data-s="${x[0]}" class="px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer border-b-2 -mb-px ${a ? 'border-pink-600 text-pink-600 dark:text-pink-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}">${L(x[1], x[2])}</button>`;
  }).join('')}</div>` : '';
  var content = {
    'products/list': adminProducts, 'products/catunit': adminCatUnit, 'equipment': adminEquip, 'users': adminUsers,
    'records/logs': adminLogs, 'records/deleted': adminDeleted,
    'backup/drive': adminDrive, 'backup/json': adminJson,
    'backup/reset': adminReset, 'settings/store': adminStore, 'settings/system': adminSysInfo
  }[adminKey()] || adminProducts;
  return `<div class="space-y-2">${banner}<div class="flex items-center gap-1.5"><div class="scs-nav-scroll flex items-center gap-1 flex-1 min-w-0">${groups}</div><button type="button" data-act="admin-lock" title="${L('Lock Admin', 'অ্যাডমিন লক করুন')}" class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 transition-all">${ic('lock-open', 'w-3.5 h-3.5')}<span>${L('Lock', 'লক')}</span></button></div>${subs}<div id="adm-content">${content()}</div></div>`;
};
ACT['adm-tab'] = function (el) {
  S.adminTab = el.getAttribute('data-t'); LS.set('scs_store_admin_tab', S.adminTab);
  if (el.getAttribute('data-s')) { S.adminSub[S.adminTab] = el.getAttribute('data-s'); LS.set('scs_store_admin_sub', JSON.stringify(S.adminSub)); }
  A.set = null;
  if (S.view !== 'admin') return go('admin');
  if (S.full !== null) setFull(null);
  renderMain(); VIEW_LOAD.admin();
};
ACT['adm-sub'] = function (el) {
  S.adminSub[S.adminTab] = el.getAttribute('data-s'); LS.set('scs_store_admin_sub', JSON.stringify(S.adminSub));
  A.set = null;
  if (S.full !== null) setFull(null);
  renderMain(); VIEW_LOAD.admin();
};
function adminLogs() {
  return `<div class="bg-white dark:bg-slate-900 rounded-xl p-2 sm:p-2.5 border border-slate-200 dark:border-slate-800"><div class="flex flex-wrap items-center gap-1.5 mb-2">${logTools()}<div class="ml-auto">${actCsv('log-csv')}</div></div><div id="log-res">${logResultHTML()}</div></div>`;
}

/* =====================================================================
 *  1. PRODUCT MANAGEMENT
 * ===================================================================== */
function pmState() { if (!A.pm) A.pm = { q: '', status: '' }; return A.pm; }
function pmRows() {
  var s = pmState(), q = s.q.trim().toLowerCase();
  return products().filter(function (p) {
    if (s.status && p.status !== s.status) return false;
    if (q && (p.code + ' ' + p.name + ' ' + p.pack + ' ' + p.cat + ' ' + p.unit).toLowerCase().indexOf(q) < 0) return false;
    return true;
  });
}
function adminProducts() {
  var s = pmState(), rows = pmRows(), canDrag = !s.q && !s.status;
  var body = rows.map(function (p, i) {
    return `<tr class="${TR}" ${canDrag ? `draggable="true" data-drag="${esc(p.id)}"` : ''}>
      <td class="${TD} text-center text-slate-400 ${canDrag ? 'cursor-grab' : 'opacity-30'}" title="${L('Drag to reorder', 'টেনে ক্রম বদলান')}">${ic('grip-vertical', 'w-4 h-4 inline')}</td>
      <td class="${TD} text-center"><input type="number" min="1" data-ch="pm-order" data-pid="${esc(p.id)}" value="${p.order}" class="w-14 px-1.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono text-center text-xs font-bold"></td>
      <td class="${TD} text-center font-mono font-bold">${esc(p.code)}</td>
      <td class="${TD} font-semibold">${esc(p.name)}</td><td class="${TD} text-center">${esc(p.pack || '-')}</td><td class="${TD} text-center">${esc(p.unit || '-')}</td><td class="${TD} text-center text-slate-500">${esc(p.cat || '-')}</td>
      <td class="${TD} text-right font-mono">${p.min ? fmtN(p.min) : '-'}</td><td class="${TD} text-right font-mono font-black">${fmtN(p.stock)}</td>
      <td class="${TD} text-center"><button type="button" data-act="pm-status" data-pid="${esc(p.id)}" class="px-2 py-0.5 rounded-full text-[10px] font-black border cursor-pointer ${p.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-200 text-slate-600 border-slate-300 dark:bg-slate-700 dark:text-slate-300'}">${p.status === 'ACTIVE' ? L('Active', 'সক্রিয়') : L('Inactive', 'নিষ্ক্রিয়')}</button></td>
      <td class="${TD} text-center whitespace-nowrap"><div class="inline-flex gap-0.5">
        <button type="button" data-act="pm-move" data-pid="${esc(p.id)}" data-d="-1" ${!canDrag || i === 0 ? 'disabled' : ''} class="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 cursor-pointer" title="${L('Move up', 'উপরে')}">${ic('chevron-up', 'w-3.5 h-3.5')}</button>
        <button type="button" data-act="pm-move" data-pid="${esc(p.id)}" data-d="1" ${!canDrag || i === rows.length - 1 ? 'disabled' : ''} class="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-25 cursor-pointer" title="${L('Move down', 'নিচে')}">${ic('chevron-down', 'w-3.5 h-3.5')}</button>
        <button type="button" data-act="pm-edit" data-pid="${esc(p.id)}" class="p-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer" title="${L('Edit', 'এডিট')}">${ic('pen-line', 'w-3.5 h-3.5')}</button>
        <button type="button" data-act="pm-del" data-pid="${esc(p.id)}" class="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer" title="${L('Delete', 'ডিলিট')}">${ic('trash-2', 'w-3.5 h-3.5')}</button></div></td></tr>`;
  }).join('');
  return card('', '', `<div class="flex flex-wrap items-center gap-1.5 mb-2">
      ${searchBox('data-in="pm-q"', s.q, L('Search code / name / pack / category', 'কোড / নাম / প্যাক / ক্যাটাগরি খুঁজুন'))}
      <select data-ch="pm-status-f" class="${SELC}">${opt('', L('All status', 'সব স্ট্যাটাস'), s.status)}${opt('ACTIVE', L('Active', 'সক্রিয়'), s.status)}${opt('INACTIVE', L('Inactive', 'নিষ্ক্রিয়'), s.status)}</select>
      ${btn(L('Add Product', 'প্রোডাক্ট যোগ'), 'pm-add', 'primary', 'plus')}</div>
    <div id="pm-table">${table(`<th class="${TH} w-8"></th><th class="${TH} w-16">${L('Serial', 'সিরিয়াল')}</th><th class="${TH}">${L('Code', 'কোড')}</th><th class="${TH} text-left">${L('Product Name', 'প্রোডাক্ট নাম')}</th><th class="${TH}">${L('Pack', 'প্যাক')}</th><th class="${TH}">${L('Unit', 'ইউনিট')}</th><th class="${TH}">${L('Category', 'ক্যাটাগরি')}</th><th class="${TH} text-right">${L('Min Stock', 'মিনিমাম')}</th><th class="${TH} text-right bg-slate-900">${L('Stock', 'স্টক')}</th><th class="${TH}">${L('Status', 'স্ট্যাটাস')}</th><th class="${TH}"></th>`, body || emptyRow(11, L('No products. Click "Add Product".', 'কোনো প্রোডাক্ট নেই। "প্রোডাক্ট যোগ" ক্লিক করুন।')))}</div>`);
}
IN['pm-q'] = function (el) { pmState().q = el.value; var c = document.getElementById('adm-content'); var pos = el.selectionStart; c.innerHTML = adminProducts(); var n = c.querySelector('[data-in="pm-q"]'); n.focus(); n.setSelectionRange(pos, pos); };
CH['pm-status-f'] = function (el) { pmState().status = el.value; renderMain(); };
function reorderTo(pid, index) {
  var ids = products().map(function (p) { return p.id; }).filter(function (x) { return x !== pid; });
  index = Math.max(0, Math.min(ids.length, index));
  ids.splice(index, 0, pid);
  api('productReorder', { ids: ids }).then(function (r) { setBoot(r.boot); renderMain(); toast(L('Display order saved.', 'ক্রম সেভ হয়েছে।'), 'success'); }).catch(failToast);
}
CH['pm-order'] = function (el) { var v = Math.round(Number(el.value)); if (v >= 1) reorderTo(el.getAttribute('data-pid'), v - 1); };
ACT['pm-move'] = function (el) {
  var pid = el.getAttribute('data-pid'), ids = products().map(function (p) { return p.id; }), i = ids.indexOf(pid);
  reorderTo(pid, i + Number(el.getAttribute('data-d')));
};
var DRAG_PID = null;
document.addEventListener('dragstart', function (e) { var r = e.target.closest && e.target.closest('[data-drag]'); if (!r) return; DRAG_PID = r.getAttribute('data-drag'); r.classList.add('opacity-40'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', DRAG_PID); } catch (x) {} });
document.addEventListener('dragend', function (e) { var r = e.target.closest && e.target.closest('[data-drag]'); if (r) r.classList.remove('opacity-40'); $$('[data-drag]').forEach(function (x) { x.classList.remove('scs-drop'); }); });
document.addEventListener('dragover', function (e) { var r = e.target.closest && e.target.closest('[data-drag]'); if (!r || !DRAG_PID) return; e.preventDefault(); $$('[data-drag]').forEach(function (x) { x.classList.toggle('scs-drop', x === r); }); });
document.addEventListener('drop', function (e) {
  var r = e.target.closest && e.target.closest('[data-drag]'); if (!r || !DRAG_PID) return;
  e.preventDefault();
  var target = r.getAttribute('data-drag'), pid = DRAG_PID; DRAG_PID = null;
  if (target === pid) return;
  var ids = products().map(function (p) { return p.id; });
  reorderTo(pid, ids.indexOf(target) > ids.indexOf(pid) ? ids.indexOf(target) : ids.indexOf(target));
});
ACT['pm-status'] = function (el) {
  var p = productById(el.getAttribute('data-pid')); if (!p) return;
  pinApi('productStatus', { id: p.id, status: p.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }, function (r) {
    setBoot(r.boot); renderMain();
    toast(p.code + ': ' + (p.status === 'ACTIVE' ? L('now Inactive — hidden from new transactions.', 'এখন নিষ্ক্রিয় — নতুন ট্রানজ্যাকশনে দেখাবে না।') : L('now Active.', 'এখন সক্রিয়।')), 'success');
  });
};
/* ---------- product form: Category dropdown → Product ID = "<Category>-<next number of that category>" (editable, must be unique) ---------- */
function allCodes() { var c = S.boot.admin && S.boot.admin.codes; return c && c.length ? c : products().map(function (p) { return [p.id, p.code]; }); }
function codeOwner(code, exceptId) {
  var k = String(code || '').trim().toLowerCase(); if (!k) return null;
  var hit = allCodes().filter(function (x) { return x[0] !== exceptId && String(x[1]).toLowerCase() === k; })[0];
  if (!hit) return null;
  return productById(hit[0]) || { code: hit[1], name: L('a deleted product', 'একটি ডিলিট করা প্রোডাক্ট') };
}
function catList() {
  var out = [], seen = {};
  ((S.boot.settings && S.boot.settings.categories) || []).concat(products().map(function (p) { return p.cat; })).forEach(function (c) {
    var v = String(c || '').trim(), k = v.toLowerCase(); if (v && !seen[k]) { seen[k] = 1; out.push(v); }
  });
  return out;
}
function reEsc(t) { return String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
/** next serial of a category: highest "<Category>-N" code (incl. deleted) or the product count of that category, + 1 */
function nextCode(cat, exceptId) {
  cat = String(cat || '').trim(); if (!cat) return '';
  var re = new RegExp('^' + reEsc(cat) + '\\s*-\\s*(\\d+)$', 'i'), max = 0, count = 0;
  products().forEach(function (p) { if (p.id !== exceptId && String(p.cat).toLowerCase() === cat.toLowerCase()) count++; });
  allCodes().forEach(function (x) { if (x[0] === exceptId) return; var m = String(x[1]).match(re); if (m) max = Math.max(max, Number(m[1])); });
  var n = Math.max(max, count) + 1;
  while (codeOwner(cat + '-' + n, exceptId)) n++;
  return cat + '-' + n;
}
function productForm(p) {
  var st = S.boot.settings, units = (st.units || []).slice(), cats = catList();
  if (p && p.unit && units.indexOf(p.unit) < 0) units.push(p.unit);
  var nextOrder = products().length + 1;
  A.pf = { id: p ? p.id : '', typed: false, origCat: p ? p.cat : '' };
  return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
    ${field(L('Product Name *', 'প্রোডাক্ট নাম *'), `<input id="pf-name" maxlength="150" autofocus value="${esc(p ? p.name : '')}" class="${INP} font-semibold">`, 'sm:col-span-2')}
    ${field(L('Pack Size', 'প্যাক সাইজ'), `<input id="pf-pack" maxlength="40" value="${esc(p ? p.pack : '')}" class="${INP}" placeholder="20">`)}
    ${field(L('Unit', 'ইউনিট'), `<select id="pf-unit" class="${INP}">${opt('', '—', p ? p.unit : '')}${units.map(function (u) { return opt(u, u, p ? p.unit : (units[0] || '')); }).join('')}</select>`)}
    ${field(L('Category *', 'ক্যাটাগরি *'), `<select id="pf-cat" data-ch="pf-cat" class="${INP}">${opt('', L('— Select category —', '— ক্যাটাগরি নির্বাচন —'), p ? p.cat : '')}${cats.map(function (c) { return opt(c, c, p ? p.cat : ''); }).join('')}${opt('__new', L('+ New category…', '+ নতুন ক্যাটাগরি…'), '')}</select>
      <input id="pf-catnew" data-in="pf-catnew" maxlength="60" placeholder="${L('New category name', 'নতুন ক্যাটাগরির নাম')}" class="${INP} mt-1 hidden">`)}
    ${field(L('Product ID / Code *', 'প্রোডাক্ট আইডি / কোড *'), `<input id="pf-code" data-in="pf-code" maxlength="40" value="${esc(p ? p.code : '')}" class="${INP} font-mono font-bold" placeholder="${L('Select category first', 'আগে ক্যাটাগরি নির্বাচন করুন')}"><div id="pf-code-msg" class="text-[10px] mt-0.5 min-h-3"></div>`)}
    ${field(L('Serial No (display order)', 'সিরিয়াল নং (ডিসপ্লে অর্ডার)'), `<input id="pf-order" type="number" min="1" value="${p ? p.order : nextOrder}" class="${INP} font-mono">`)}
    ${field(L('Minimum Stock', 'মিনিমাম স্টক'), `<input id="pf-min" type="number" min="0" step="any" value="${p ? p.min : 0}" class="${INP} font-mono">`)}
    ${field(L('Status', 'স্ট্যাটাস'), `<select id="pf-status" class="${INP}">${opt('ACTIVE', L('Active', 'সক্রিয়'), p ? p.status : 'ACTIVE')}${opt('INACTIVE', L('Inactive', 'নিষ্ক্রিয়'), p ? p.status : 'ACTIVE')}</select>`)}
    </div>`;
}
function pfCat() { var v = val('pf-cat'); return v === '__new' ? val('pf-catnew').trim() : v; }
function pfCheckCode() {
  var m = document.getElementById('pf-code-msg'); if (!m) return true;
  var code = val('pf-code').trim(), who = codeOwner(code, A.pf && A.pf.id);
  m.className = 'text-[10px] mt-0.5 min-h-3 font-semibold ' + (who ? 'text-rose-600' : 'text-emerald-600');
  m.textContent = !code ? '' : who ? L('Already used by ', 'আগে থেকেই ব্যবহৃত: ') + who.code + ' - ' + who.name : '✓ ' + L('Available', 'ব্যবহারযোগ্য');
  return !who;
}
function pfSuggest() {
  if (!A.pf || A.pf.typed) return;
  var cat = pfCat(), inp = document.getElementById('pf-code'); if (!inp) return;
  if (A.pf.id && cat.toLowerCase() === String(A.pf.origCat || '').toLowerCase()) { var p = productById(A.pf.id); inp.value = p ? p.code : inp.value; }
  else inp.value = nextCode(cat, A.pf.id);
  pfCheckCode();
}
CH['pf-cat'] = function (el) {
  var n = document.getElementById('pf-catnew');
  if (n) { n.classList.toggle('hidden', el.value !== '__new'); if (el.value === '__new') n.focus(); }
  pfSuggest();
};
IN['pf-catnew'] = function () { pfSuggest(); };
IN['pf-code'] = function () { if (A.pf) A.pf.typed = true; pfCheckCode(); };
ACT['pm-add'] = function () {
  openModal({ id: 'pform', title: L('Add Product', 'প্রোডাক্ট যোগ'), icon: 'package-plus', size: 'max-w-xl', body: productForm(null),
    foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="pform"') + btn(L('Save Product', 'প্রোডাক্ট সেভ'), 'pm-save', 'primary', 'save') });
};
ACT['pm-edit'] = function (el) {
  var p = productById(el.getAttribute('data-pid')); if (!p) return;
  openModal({ id: 'pform', title: L('Edit Product', 'প্রোডাক্ট এডিট'), sub: '<span class="font-mono">' + esc(p.id) + '</span>', icon: 'pen-line', size: 'max-w-xl', body: productForm(p),
    foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="pform"') + btn(L('Save Changes', 'পরিবর্তন সেভ'), 'pm-save', 'primary', 'save', 'data-pid="' + esc(p.id) + '"') });
  setTimeout(pfCheckCode, 40);
};
ACT['pm-save'] = function (el) {
  var d = { id: el.getAttribute('data-pid') || '', code: val('pf-code').trim(), name: val('pf-name').trim(), pack: val('pf-pack').trim(), unit: val('pf-unit'), cat: pfCat(),
    order: Number(val('pf-order')), min: Number(val('pf-min')) || 0, status: val('pf-status') };
  if (!d.name) return toast(L('Product Name is required.', 'প্রোডাক্ট নাম দিতে হবে।'), 'error');
  if (!d.cat) return toast(L('Select a category.', 'ক্যাটাগরি নির্বাচন করুন।'), 'error');
  if (!d.code) return toast(L('Product ID / Code is required.', 'প্রোডাক্ট আইডি / কোড দিতে হবে।'), 'error');
  if (!pfCheckCode()) return toast(L('This Product ID is already used. Every product needs a different ID.', 'এই প্রোডাক্ট আইডি আগে থেকেই ব্যবহৃত। প্রতিটি প্রোডাক্টের আইডি আলাদা হতে হবে।'), 'error');
  (d.id ? pinApi : function (a, x, done) { api(a, x).then(function (r) { CACHE = {}; done(r); }).catch(failToast); })('productSave', d, function (r) {
    setBoot(r.boot); closeModal('pform'); renderMain();
    toast(d.id ? L('Product updated everywhere.', 'প্রোডাক্ট সব জায়গায় আপডেট হয়েছে।') : L('Product added: ', 'প্রোডাক্ট যোগ হয়েছে: ') + d.code, 'success');
  });
};
ACT['pm-del'] = function (el) {
  var p = productById(el.getAttribute('data-pid')); if (!p) return;
  var hist = p.allTx > 0;
  var body = `<div class="space-y-3 text-xs"><div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"><b class="font-mono">${esc(p.code)}</b> — <b>${esc(p.name)}</b> ${esc(p.pack)}<div class="text-slate-500 mt-1">${L('Current stock', 'বর্তমান স্টক')}: <b>${fmtN(p.stock)}</b> • ${L('Transactions', 'ট্রানজ্যাকশন')}: <b>${p.allTx}</b></div></div>
    ${hist ? `<div class="flex gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200">${ic('info', 'w-4 h-4 shrink-0')}<span>${L('This product has transaction history, so it cannot be permanently deleted. It will be moved to Deleted Records (Soft Delete). Old history stays unchanged and it can be restored later.', 'এই প্রোডাক্টের ট্রানজ্যাকশন হিস্টোরি আছে, তাই স্থায়ীভাবে মোছা যাবে না। এটি Deleted Records-এ যাবে (Soft Delete)। পুরোনো হিস্টোরি অপরিবর্তিত থাকবে এবং পরে Restore করা যাবে।')}</span></div>`
      : `<label class="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 cursor-pointer"><input type="checkbox" id="pd-perm" class="w-4 h-4 mt-0.5 accent-rose-600"><span>${L('No transaction history. Delete permanently (cannot be undone). If unchecked, it goes to Deleted Records.', 'কোনো ট্রানজ্যাকশন হিস্টোরি নেই। স্থায়ীভাবে মুছে ফেলুন (ফেরানো যাবে না)। টিক না দিলে Deleted Records-এ যাবে।')}</span></label>`}
    ${field(L('Reason (required)', 'কারণ (আবশ্যক)'), `<textarea id="pd-reason" rows="2" autofocus class="${INP}"></textarea>`)}</div>`;
  openModal({ id: 'pdel', title: L('Delete Product', 'প্রোডাক্ট ডিলিট'), icon: 'trash-2', size: 'max-w-md', body: body,
    foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="pdel"') + btn(L('Delete', 'ডিলিট'), 'pm-del-ok', 'danger', 'trash-2', 'data-pid="' + esc(p.id) + '"') });
};
ACT['pm-del-ok'] = function (el) {
  var reason = val('pd-reason').trim(), perm = !!(document.getElementById('pd-perm') && document.getElementById('pd-perm').checked);
  if (!reason) return toast(L('Please write the reason.', 'কারণ লিখুন।'), 'error');
  pinApi('productDelete', { id: el.getAttribute('data-pid'), reason: reason, permanent: perm }, function (r) {
    setBoot(r.boot); closeModal('pdel'); renderMain();
    toast(r.permanent ? L('Product permanently deleted.', 'প্রোডাক্ট স্থায়ীভাবে মুছে ফেলা হয়েছে।') : L('Product moved to Deleted Records. History is safe.', 'প্রোডাক্ট Deleted Records-এ গেছে। হিস্টোরি নিরাপদ।'), 'success');
  });
};

/* =====================================================================
 *  2. USERS & PIN (Admin PIN change also lives here — only place)
 * ===================================================================== */
function adminUsers() {
  var d = A.users;
  if (!d) return loadingBlock();
  var rows = d.users.map(function (u) {
    var me = u.id === d.me;
    return `<tr class="${TR}"><td class="${TD} font-semibold">${esc(u.name)} ${me ? chip(L('You', 'আপনি')) : ''}</td>
      <td class="${TD} text-center"><span class="px-2 py-0.5 rounded-full text-[10px] font-black border ${u.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800' : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}">${u.role === 'ADMIN' ? 'Admin' : L('User', 'ইউজার')}</span></td>
      <td class="${TD} text-center"><span class="text-[10px] font-black ${u.status === 'ACTIVE' ? 'text-emerald-600' : 'text-rose-600'}">${u.status === 'ACTIVE' ? L('Active', 'সক্রিয়') : L('Disabled', 'বন্ধ')}</span></td>
      <td class="${TD} text-center font-mono">${'•'.repeat(u.pinLen)}</td><td class="${TD} text-center whitespace-nowrap">${u.lastLogin ? fmtDT(u.lastLogin) : '-'}</td>
      <td class="${TD} text-center whitespace-nowrap"><div class="inline-flex gap-1"><button type="button" data-act="us-edit" data-id="${esc(u.id)}" class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer" title="${L('Edit / change PIN', 'এডিট / পিন পরিবর্তন')}">${ic('key-round', 'w-3.5 h-3.5')}</button>
      ${me ? '' : `<button type="button" data-act="us-del" data-id="${esc(u.id)}" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer" title="${L('Delete', 'ডিলিট')}">${ic('trash-2', 'w-3.5 h-3.5')}</button>`}</div></td></tr>`;
  }).join('');
  return card('', '',
    `<div class="flex justify-end mb-1.5">${btn(L('Add User', 'ইউজার যোগ'), 'us-add', 'primary', 'user-plus')}</div>` +
    table(`<th class="${TH} text-left">${L('Name', 'নাম')}</th><th class="${TH}">${L('Role', 'ভূমিকা')}</th><th class="${TH}">${L('Status', 'স্ট্যাটাস')}</th><th class="${TH}">PIN</th><th class="${TH}">${L('Last Login', 'শেষ লগইন')}</th><th class="${TH}"></th>`, rows));
}
function userForm(u) {
  return `<div class="space-y-2">${field(L('Name *', 'নাম *'), `<input id="uf-name" maxlength="60" autofocus value="${esc(u ? u.name : '')}" class="${INP}">`)}
    <div class="grid grid-cols-2 gap-2">${field(L('Role', 'ভূমিকা'), `<select id="uf-role" class="${INP}">${opt('USER', L('User', 'ইউজার'), u ? u.role : 'USER')}${opt('ADMIN', 'Admin', u ? u.role : 'USER')}</select>`)}
    ${field(L('Status', 'স্ট্যাটাস'), `<select id="uf-status" class="${INP}">${opt('ACTIVE', L('Active', 'সক্রিয়'), u ? u.status : 'ACTIVE')}${opt('DISABLED', L('Disabled', 'বন্ধ'), u ? u.status : 'ACTIVE')}</select>`)}</div>
    <div class="grid grid-cols-2 gap-2">${field(u ? L('New PIN (leave blank to keep)', 'নতুন পিন (না বদলালে খালি রাখুন)') : L('PIN (4–8 digits) *', 'পিন (৪–৮ ডিজিট) *'), `<input id="uf-pin" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" class="${INP} font-mono">`)}
    ${field(L('Confirm PIN', 'পিন নিশ্চিত করুন'), `<input id="uf-pin2" type="password" inputmode="numeric" maxlength="8" autocomplete="new-password" class="${INP} font-mono">`)}</div>
    </div>`;
}
ACT['us-add'] = function () { openModal({ id: 'uform', title: L('Add User', 'ইউজার যোগ'), icon: 'user-plus', size: 'max-w-md', body: userForm(null), foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="uform"') + btn(L('Save', 'সেভ'), 'us-save', 'primary', 'save') }); };
ACT['us-edit'] = function (el) {
  var u = A.users.users.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (!u) return;
  openModal({ id: 'uform', title: L('Edit User', 'ইউজার এডিট'), icon: 'key-round', size: 'max-w-md', body: userForm(u), foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="uform"') + btn(L('Save', 'সেভ'), 'us-save', 'primary', 'save', 'data-id="' + esc(u.id) + '"') });
};
ACT['us-save'] = function (el) {
  var pin = val('uf-pin').trim(), pin2 = val('uf-pin2').trim(), id = el.getAttribute('data-id') || '';
  if (pin && !/^\d{4,8}$/.test(pin)) return toast(L('PIN must be 4 to 8 digits.', 'পিন ৪ থেকে ৮ ডিজিটের হতে হবে।'), 'error');
  if (pin !== pin2) return toast(L('PIN and confirmation do not match.', 'পিন ও কনফার্ম পিন মিলছে না।'), 'error');
  (id ? pinApi : function (a, x, done) { api(a, x).then(function (r) { CACHE = {}; done(r); }).catch(failToast); })('userSave', { id: id, name: val('uf-name').trim(), role: val('uf-role'), status: val('uf-status'), pin: pin }, function (d) {
    A.users = d; closeModal('uform'); toast(L('User saved.', 'ইউজার সেভ হয়েছে।'), 'success');
    api('bootstrap', {}, { silent: true }).then(function (b) { setBoot(b); renderMain(); }).catch(failToast);
  });
};
ACT['us-del'] = function (el) {
  var u = A.users.users.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0]; if (!u) return;
  confirmBox({ title: L('Delete User', 'ইউজার ডিলিট'), danger: true, okText: L('Delete', 'ডিলিট'), message: '<b>' + esc(u.name) + '</b> — ' + L('Old transactions keep this name. To only block access, set status to Disabled instead.', 'পুরোনো ট্রানজ্যাকশনে এই নাম থাকবে। শুধু অ্যাক্সেস বন্ধ করতে চাইলে স্ট্যাটাস "বন্ধ" করুন।'),
    onOk: function () { pinApi('userDelete', { id: u.id }, function (d) { A.users = d; renderMain(); toast(L('User deleted.', 'ইউজার ডিলিট হয়েছে।'), 'success'); }); } });
};

/* =====================================================================
 *  3. DELETED RECORDS (only place for Restore / Permanent Delete)
 * ===================================================================== */
function delList(d, kind) { return kind === 'product' ? d.products : kind === 'txn' ? d.txns : kind === 'equip' ? (d.equip || []) : kind === 'etxn' ? (d.etxns || []) : d.logs; }
function adminDeleted() {
  var d = A.deleted;
  if (!d) return loadingBlock();
  var kind = A.delKind || 'txn', sel = A.delSel || (A.delSel = {});
  var list = delList(d, kind);
  var nSel = Object.keys(sel).length;
  var tabs = [['txn', L('Transactions', 'ট্রানজ্যাকশন'), d.txns.length], ['product', L('Products', 'প্রোডাক্ট'), d.products.length], ['etxn', L('Equipment Entries', 'ইকুইপমেন্ট এন্ট্রি'), (d.etxns || []).length], ['equip', L('Equipment', 'ইকুইপমেন্ট'), (d.equip || []).length], ['log', L('Activity Logs', 'অ্যাক্টিভিটি লগ'), d.logs.length]].map(function (t) {
    var a = kind === t[0];
    return `<button type="button" data-act="del-kind" data-k="${t[0]}" class="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${a ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200'}">${t[1]} <span class="px-1.5 rounded-full text-[10px] font-black ${a ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700'}">${t[2]}</span></button>`;
  }).join('');
  var cb = function (id) { return `<td class="${TD} text-center"><input type="checkbox" data-ch="del-sel" data-id="${esc(id)}" ${sel[id] ? 'checked' : ''} class="w-4 h-4 accent-pink-600 cursor-pointer"></td>`; };
  var info = function (x) { return `<td class="${TD} text-[11px]"><b>${esc(x.deletedBy)}</b><div class="text-slate-400">${fmtDT(x.deletedAt)}</div></td><td class="${TD} text-[11px] text-rose-700 dark:text-rose-300">${esc(x.reason)}</td>`; };
  var head, rows;
  if (kind === 'product') {
    head = `<th class="${TH} w-8"></th><th class="${TH}">${L('Code', 'কোড')}</th><th class="${TH} text-left">${L('Product', 'প্রোডাক্ট')}</th><th class="${TH}">${L('History', 'হিস্টোরি')}</th><th class="${TH}">${L('Deleted by', 'ডিলিট করেছেন')}</th><th class="${TH} text-left">${L('Reason', 'কারণ')}</th>`;
    rows = list.map(function (p) { return `<tr class="${TR}">${cb(p.id)}<td class="${TD} text-center font-mono font-bold">${esc(p.code)}</td><td class="${TD} font-semibold">${esc(p.name)} <span class="text-slate-400">${esc(p.pack)}</span></td><td class="${TD} text-center">${p.allTx ? p.allTx + ' ' + L('txns', 'টি') : '-'}</td>${info(p)}</tr>`; }).join('');
  } else if (kind === 'equip') {
    head = `<th class="${TH} w-8"></th><th class="${TH}">${L('SCS ID', 'SCS আইডি')}</th><th class="${TH} text-left">${L('Equipment', 'ইকুইপমেন্ট')}</th><th class="${TH}">${L('History', 'হিস্টোরি')}</th><th class="${TH}">${L('Deleted by', 'ডিলিট করেছেন')}</th><th class="${TH} text-left">${L('Reason', 'কারণ')}</th>`;
    rows = list.map(function (e) { return `<tr class="${TR}">${cb(e.id)}<td class="${TD} text-center font-mono font-bold">${esc(e.code)}</td><td class="${TD} font-semibold">${esc(e.name)} <span class="text-slate-400">${esc(e.brand)} ${esc(e.model)}</span></td><td class="${TD} text-center">${e.allTx ? e.allTx : '-'}</td><td class="${TD} text-[11px]"><b>${esc(e.deletedBy)}</b><div class="text-slate-400">${fmtDT(e.deletedAt)}</div></td><td class="${TD} text-[11px] text-rose-700 dark:text-rose-300">${esc(e.delReason)}</td></tr>`; }).join('');
  } else if (kind === 'etxn') {
    head = `<th class="${TH} w-8"></th><th class="${TH}">${L('Date', 'তারিখ')}</th><th class="${TH}">${L('Type', 'টাইপ')}</th><th class="${TH} text-left">${L('Equipment', 'ইকুইপমেন্ট')}</th><th class="${TH}">${L('Qty', 'পরিমাণ')}</th><th class="${TH}">${L('Deleted by', 'ডিলিট করেছেন')}</th><th class="${TH} text-left">${L('Reason', 'কারণ')}</th>`;
    rows = list.map(function (x) { return `<tr class="${TR}">${cb(x.id)}<td class="${TD} whitespace-nowrap">${fmtD(x.date)}</td><td class="${TD} text-center">${badgeType(x.type)}</td><td class="${TD}"><b class="font-mono">${esc(x.code)}</b> ${esc(x.name)}<div class="text-[10px] text-slate-400 font-mono">${esc(x.id)}</div></td><td class="${TD} text-center font-mono font-black">${fmtN(x.qty)}</td><td class="${TD} text-[11px]"><b>${esc(x.deletedBy)}</b><div class="text-slate-400">${fmtDT(x.deletedAt)}</div></td><td class="${TD} text-[11px] text-rose-700 dark:text-rose-300">${esc(x.delReason)}</td></tr>`; }).join('');
  } else if (kind === 'txn') {
    head = `<th class="${TH} w-8"></th><th class="${TH}">${L('Date', 'তারিখ')}</th><th class="${TH}">${L('Type', 'টাইপ')}</th><th class="${TH} text-left">${L('Product', 'প্রোডাক্ট')}</th><th class="${TH} text-right">${L('Qty', 'পরিমাণ')}</th><th class="${TH}">${L('Deleted by', 'ডিলিট করেছেন')}</th><th class="${TH} text-left">${L('Reason', 'কারণ')}</th>`;
    rows = list.map(function (x) { return `<tr class="${TR}">${cb(x.id)}<td class="${TD} whitespace-nowrap">${fmtD(x.date)}</td><td class="${TD} text-center">${badgeType(x.type)}</td><td class="${TD}"><b class="font-mono">${esc(x.code)}</b> ${esc(x.name)} <div class="text-[10px] text-slate-400 font-mono">${esc(x.id)} • ${esc(x.user)}</div></td><td class="${TD} text-right font-mono font-black">${fmtN(x.qty)}</td>${info(x)}</tr>`; }).join('');
  } else {
    head = `<th class="${TH} w-8"></th><th class="${TH}">${L('Time', 'সময়')}</th><th class="${TH}">${L('Action', 'কাজ')}</th><th class="${TH} text-left">${L('Summary', 'বিবরণ')}</th><th class="${TH}">${L('Deleted by', 'ডিলিট করেছেন')}</th><th class="${TH} text-left">${L('Reason', 'কারণ')}</th>`;
    rows = list.map(function (x) { return `<tr class="${TR}">${cb(x.id)}<td class="${TD} whitespace-nowrap">${fmtDT(x.ts)}<div class="text-[10px] text-slate-400">${esc(x.user)}</div></td><td class="${TD} text-center">${actionBadge(x.action)}</td><td class="${TD} text-[11px]">${esc(x.summary)}</td>${info(x)}</tr>`; }).join('');
  }
  return card('', '',
    `<div class="flex flex-wrap items-center justify-between gap-1.5 mb-2"><div class="flex flex-wrap gap-1">${tabs}</div><div class="flex gap-2">
      ${btn(L('Restore', 'রিস্টোর') + ' (' + nSel + ')', 'del-restore', 'success', 'archive-restore', nSel ? '' : 'disabled')}${btn(L('Delete Permanently', 'স্থায়ীভাবে মুছুন') + ' (' + nSel + ')', 'del-purge', 'danger', 'trash-2', nSel ? '' : 'disabled')}</div></div>` +
    table(head.replace(`<th class="${TH} w-8"></th>`, `<th class="${TH} w-8"><input type="checkbox" data-ch="del-all" class="w-4 h-4 accent-pink-600 cursor-pointer"></th>`), rows || emptyRow(7, L('Nothing here.', 'এখানে কিছু নেই।'))));
}
ACT['del-kind'] = function (el) { A.delKind = el.getAttribute('data-k'); A.delSel = {}; renderMain(); };
CH['del-sel'] = function (el) { var id = el.getAttribute('data-id'); if (el.checked) A.delSel[id] = 1; else delete A.delSel[id]; document.getElementById('adm-content').innerHTML = adminDeleted(); };
CH['del-all'] = function (el) {
  var d = A.deleted, kind = A.delKind || 'txn', list = delList(d, kind);
  A.delSel = {}; if (el.checked) list.forEach(function (x) { A.delSel[x.id] = 1; });
  document.getElementById('adm-content').innerHTML = adminDeleted();
};
function afterDeleted(r, msg) { A.deleted = r.deleted; A.delSel = {}; setBoot(r.boot); renderMain(); toast(msg, 'success'); }
ACT['del-restore'] = function () {
  var ids = Object.keys(A.delSel || {}); if (!ids.length) return;
  pinApi('restoreRecords', { kind: A.delKind || 'txn', ids: ids }, function (r) { afterDeleted(r, r.restored + L(' record(s) restored.', 'টি রেকর্ড রিস্টোর হয়েছে।')); });
};
ACT['del-purge'] = function () {
  var ids = Object.keys(A.delSel || {}); if (!ids.length) return;
  confirmBox({ title: L('Delete Permanently', 'স্থায়ীভাবে মুছুন'), danger: true, typeWord: 'DELETE', okText: L('Delete forever', 'চিরতরে মুছুন'),
    message: ids.length + L(' record(s) will be removed forever. This cannot be undone (take a JSON backup first if unsure).', 'টি রেকর্ড চিরতরে মুছে যাবে। এটি ফেরানো যাবে না (নিশ্চিত না হলে আগে JSON ব্যাকআপ নিন)।'),
    onOk: function () { pinApi('purgeRecords', { kind: A.delKind || 'txn', ids: ids, confirm: 'DELETE' }, function (r) { afterDeleted(r, r.purged + L(' record(s) permanently deleted.', 'টি রেকর্ড স্থায়ীভাবে মুছে ফেলা হয়েছে।')); }); } });
};

/* =====================================================================
 *  4. BACKUP & RESTORE (JSON export / import + Google Drive auto backup)
 * ===================================================================== */
var RETENTIONS = [7, 15, 30, 60, 90, 180, 365];
function backupParts() {
  var c = A.backup;
  if (!c) return null;
  var ex = A.exp || (A.exp = { scope: 'FULL', year: today().slice(0, 4), month: today().slice(0, 7), date: today(), from: today().slice(0, 8) + '01', to: today() });
  var bf = A.bf || (A.bf = { enabled: c.enabled, freq: c.freq, customVal: c.customMin % 1440 === 0 ? c.customMin / 1440 : c.customMin % 60 === 0 ? c.customMin / 60 : c.customMin, customUnit: c.customMin % 1440 === 0 ? 1440 : c.customMin % 60 === 0 ? 60 : 1, retention: c.retention, skip: c.skipUnchanged });
  var retCustom = RETENTIONS.indexOf(Number(bf.retention)) < 0 && Number(bf.retention) !== 0;
  var stat = function (label, value, cls) { return `<div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"><div class="text-[10px] text-slate-400 font-bold uppercase">${label}</div><div class="font-bold text-xs mt-0.5 break-all ${cls || ''}">${value}</div></div>`; };
  var folder = card(L('Google Drive Folder', 'Google Drive ফোল্ডার'), '',
    `<div class="flex gap-2"><input id="bk-folder" value="${esc(c.folderId)}" placeholder="https://drive.google.com/drive/folders/..." class="${INP} font-mono text-xs">${btn(L('Save', 'সেভ'), 'bk-folder-save', 'primary', 'save')}</div>
    <p class="mt-2 text-[11px] font-semibold ${c.folderName ? 'text-emerald-600' : 'text-amber-600'}">${c.folderName ? '✓ ' + esc(c.folderName) : c.folderError ? esc(c.folderError) : L('No folder set — Drive backup cannot run until you set one.', 'কোনো ফোল্ডার সেট নেই — ফোল্ডার না দিলে Drive ব্যাকআপ চলবে না।')}</p>`);
  var auto = card(L('Automatic Google Drive Backup', 'স্বয়ংক্রিয় Google Drive ব্যাকআপ'), '',
    `<div class="grid grid-cols-1 md:grid-cols-2 gap-2">
      <label class="flex items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer md:col-span-2"><input type="checkbox" id="bf-enabled" data-ch="bf" data-k="enabled" ${bf.enabled ? 'checked' : ''} class="w-4 h-4 accent-pink-600"><span class="text-xs font-bold">${L('Enable automatic backup', 'স্বয়ংক্রিয় ব্যাকআপ চালু')}</span></label>
      ${field(L('Backup Frequency', 'ব্যাকআপ ফ্রিকোয়েন্সি'), `<select data-ch="bf" data-k="freq" class="${INP}">${c.freqs.map(function (f) { return opt(f.id, f.label, bf.freq); }).join('')}</select>`)}
      ${bf.freq === 'custom' ? field(L('Custom Interval', 'কাস্টম ইন্টারভাল'), `<div class="flex gap-2"><input type="number" min="1" data-ch="bf" data-k="customVal" value="${esc(bf.customVal)}" class="${INP} font-mono"><select data-ch="bf" data-k="customUnit" class="${SEL}">${opt(1, L('Minutes', 'মিনিট'), bf.customUnit)}${opt(60, L('Hours', 'ঘণ্টা'), bf.customUnit)}${opt(1440, L('Days', 'দিন'), bf.customUnit)}</select></div>`) : '<div></div>'}
      ${field(L('Backup Retention', 'ব্যাকআপ কতদিন রাখা হবে'), `<select data-ch="bf" data-k="retSel" class="${INP}">${RETENTIONS.map(function (d) { return opt(d, d + ' ' + L('Days', 'দিন'), retCustom ? 'custom' : bf.retention); }).join('')}${opt(0, L('Keep All Backups', 'সব ব্যাকআপ রাখুন'), retCustom ? 'custom' : bf.retention)}${opt('custom', L('Custom Retention Period', 'কাস্টম সময়'), retCustom ? 'custom' : bf.retention)}</select>`)}
      ${retCustom ? field(L('Custom retention (days)', 'কাস্টম সময় (দিন)'), `<input type="number" min="1" data-ch="bf" data-k="retention" value="${esc(bf.retention)}" class="${INP} font-mono">`) : '<div></div>'}
      <label class="flex items-center gap-2 md:col-span-2 cursor-pointer"><input type="checkbox" data-ch="bf" data-k="skip" ${bf.skip ? 'checked' : ''} class="w-4 h-4 accent-pink-600"><span class="text-xs">${L('Skip when nothing changed since the last backup (saves Drive space and Apps Script quota)', 'শেষ ব্যাকআপের পর কিছু না বদলালে বাদ দিন (Drive জায়গা ও Apps Script কোটা বাঁচে)')}</span></label></div>
    ${(bf.freq === '1m' || bf.freq === '5m' || (bf.freq === 'custom' && bf.customVal * bf.customUnit < 10)) ? `<p class="mt-2 text-[11px] text-amber-700 dark:text-amber-300 flex gap-1.5">${ic('triangle-alert', 'w-3.5 h-3.5 shrink-0')}${L('Very frequent backups use a lot of the daily Apps Script trigger quota. Keep "skip when nothing changed" on.', 'খুব ঘন ঘন ব্যাকআপ Apps Script-এর দৈনিক Trigger কোটা বেশি খরচ করে। "কিছু না বদলালে বাদ দিন" চালু রাখুন।')}</p>` : ''}
    <div class="flex flex-wrap justify-end gap-2 mt-2">${btn(L('Backup Now (to Drive)', 'এখনই ব্যাকআপ (Drive-এ)'), 'bk-now', 'dark', 'cloud-upload', c.folderId ? '' : 'disabled')}${btn(L('Save Backup Settings', 'ব্যাকআপ সেটিংস সেভ'), 'bk-cfg-save', 'primary', 'save')}</div>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
      ${stat(L('Last Successful Backup', 'সর্বশেষ সফল ব্যাকআপ'), c.lastOkAt ? fmtDT(c.lastOkAt) : '-', 'text-emerald-600')}
      ${stat(L('Next Scheduled Backup', 'পরবর্তী নির্ধারিত ব্যাকআপ'), c.enabled ? (c.nextAt ? fmtDT(c.nextAt) : '-') : L('Disabled', 'বন্ধ'))}
      ${stat(L('Total Backup Files', 'মোট ব্যাকআপ ফাইল'), fmtN(c.totalFiles))}
      ${stat(L('Backup Folder', 'ব্যাকআপ ফোল্ডার'), esc(c.folderName || '-'))}
      ${stat(L('Last Backup Status', 'শেষ ব্যাকআপ স্ট্যাটাস'), esc(c.lastStatus || '-') + (c.lastRunAt ? '<div class="text-[10px] text-slate-400 font-normal">' + fmtDT(c.lastRunAt) + '</div>' : ''), /FAIL/.test(c.lastStatus) ? 'text-rose-600' : '')}
      ${stat(L('Last Backup Error', 'শেষ ব্যাকআপ এরর'), esc(c.lastError || L('None', 'নেই')), c.lastError ? 'text-rose-600' : 'text-slate-400')}
    </div>${c.enabled && !c.triggerInstalled ? `<p class="mt-2 text-[11px] text-rose-600 font-bold">${L('Trigger missing — click "Save Backup Settings" again.', 'Trigger নেই — আবার "ব্যাকআপ সেটিংস সেভ" ক্লিক করুন।')}</p>` : ''}`);
  var scopes = [['FULL', L('Full System', 'সম্পূর্ণ সিস্টেম')], ['LIFETIME', L('Lifetime', 'লাইফটাইম')], ['YEARLY', L('Yearly', 'বাৎসরিক')], ['MONTHLY', L('Monthly', 'মাসিক')], ['DAILY', L('Daily', 'দৈনিক')], ['CUSTOM', L('Custom Date Range', 'কাস্টম তারিখ সীমা')]];
  var years = []; for (var y = Number(today().slice(0, 4)); y >= 2023; y--) years.push(y);
  var picker = ex.scope === 'YEARLY' ? `<select data-ch="ex" data-k="year" class="${SEL}">${years.map(function (y) { return opt(y, y, ex.year); }).join('')}</select>`
    : ex.scope === 'MONTHLY' ? `<input type="month" data-ch="ex" data-k="month" value="${esc(ex.month)}" class="${SEL}">`
    : ex.scope === 'DAILY' ? `<input type="date" data-ch="ex" data-k="date" value="${esc(ex.date)}" class="${SEL}">`
    : ex.scope === 'CUSTOM' ? `<input type="date" data-ch="ex" data-k="from" value="${esc(ex.from)}" class="${SEL}"><span class="text-xs text-slate-400">${L('to', 'থেকে')}</span><input type="date" data-ch="ex" data-k="to" value="${esc(ex.to)}" class="${SEL}">` : '';
  var desc = { FULL: L('Everything: products & display order, all transactions, activity logs, deleted records, users (PIN hashes), system & backup settings, backup history.', 'সবকিছু: প্রোডাক্ট ও ডিসপ্লে অর্ডার, সব ট্রানজ্যাকশন, অ্যাক্টিভিটি লগ, ডিলিটেড রেকর্ড, ইউজার (পিন হ্যাশ), সিস্টেম ও ব্যাকআপ সেটিংস, ব্যাকআপ হিস্টোরি।'),
    LIFETIME: L('All products, all transactions and all activity logs (no users or settings).', 'সব প্রোডাক্ট, সব ট্রানজ্যাকশন ও সব অ্যাক্টিভিটি লগ (ইউজার বা সেটিংস ছাড়া)।') }[ex.scope] || L('All products + transactions and activity logs of the selected period.', 'সব প্রোডাক্ট + নির্বাচিত সময়ের ট্রানজ্যাকশন ও অ্যাক্টিভিটি লগ।');
  var exportCard = card(L('1) JSON Export (download)', '১) JSON এক্সপোর্ট (ডাউনলোড)'), '', `<div class="flex flex-wrap gap-1.5 mb-2">${scopes.map(function (s) { var a = ex.scope === s[0]; return `<button type="button" data-act="ex-scope" data-s="${s[0]}" class="px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer ${a ? 'bg-pink-600 text-white border-pink-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}">${s[1]}</button>`; }).join('')}</div>
    <div class="flex flex-wrap items-center gap-2 mb-2">${picker}</div><p class="text-[11px] text-slate-500 mb-2">${desc}</p>${btn(L('Export JSON', 'JSON এক্সপোর্ট'), 'ex-go', 'success', 'download')}`);
  var importCard = card(L('2) JSON Import / Restore', '২) JSON ইমপোর্ট / রিস্টোর'), '',
    `<label class="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-pink-400 cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-300">${ic('upload', 'w-4 h-4 text-pink-600')}<span>${A.imp ? esc(A.imp.name) : L('Choose backup .json file', 'ব্যাকআপ .json ফাইল নির্বাচন করুন')}</span><input type="file" accept=".json,application/json" data-ch="imp-file" class="hidden"></label>
    <div id="imp-box">${importPreviewHTML()}</div>`);
  var hist = card(L('Backup History', 'ব্যাকআপ হিস্টোরি'), '', table(`<th class="${TH}">${L('Time', 'সময়')}</th><th class="${TH}">${L('Trigger', 'ধরন')}</th><th class="${TH} text-left">${L('File', 'ফাইল')}</th><th class="${TH} text-right">KB</th><th class="${TH}">${L('Status', 'স্ট্যাটাস')}</th><th class="${TH}">${L('By', 'কে')}</th>`,
    c.history.map(function (h) { return `<tr class="${TR}"><td class="${TD} whitespace-nowrap">${fmtDT(h.Timestamp)}</td><td class="${TD} text-center text-[10px] font-bold">${esc(h.Trigger)}</td><td class="${TD} text-[11px] font-mono break-all">${esc(h.FileName || '-')}${h.Error ? `<div class="text-rose-600 font-sans">${esc(h.Error)}</div>` : ''}</td><td class="${TD} text-right font-mono">${esc(h.SizeKB)}</td><td class="${TD} text-center font-black text-[10px] ${h.Status === 'OK' ? 'text-emerald-600' : 'text-rose-600'}">${esc(h.Status)}</td><td class="${TD} text-[11px]">${esc(h.UserName)}</td></tr>`; }).join('') || emptyRow(6)));
  return { folder: folder, auto: auto, exportCard: exportCard, importCard: importCard, hist: hist };
}
function adminDrive() { var b = backupParts(); return b ? `<div class="space-y-2">${b.folder}${b.auto}${b.hist}</div>` : loadingBlock(); }
function adminJson() { var b = backupParts(); return b ? `<div class="grid grid-cols-1 xl:grid-cols-2 gap-2">${b.exportCard}${b.importCard}</div>` : loadingBlock(); }
ACT['bk-folder-save'] = function () {
  api('driveFolderSave', { folder: val('bk-folder').trim() }).then(function (c) { A.backup = c; renderMain(); toast(c.folderName ? L('Folder saved: ', 'ফোল্ডার সেভ: ') + c.folderName : L('Folder removed.', 'ফোল্ডার মুছে ফেলা হয়েছে।'), 'success'); }).catch(failToast);
};
CH['bf'] = function (el) {
  var bf = A.bf, k = el.getAttribute('data-k');
  if (k === 'enabled' || k === 'skip') bf[k] = el.checked;
  else if (k === 'retSel') bf.retention = el.value === 'custom' ? 45 : Number(el.value);
  else if (k === 'customVal' || k === 'customUnit' || k === 'retention') bf[k] = Number(el.value);
  else bf[k] = el.value;
  renderMain();
};
ACT['bk-cfg-save'] = function () {
  var bf = A.bf;
  api('backupConfigSave', { enabled: !!bf.enabled, freq: bf.freq, customMin: Math.round(Number(bf.customVal) * Number(bf.customUnit)), retention: Number(bf.retention), skipUnchanged: !!bf.skip })
    .then(function (c) { A.backup = c; A.bf = null; renderMain(); toast(c.enabled ? L('Automatic backup is ON. Next: ', 'স্বয়ংক্রিয় ব্যাকআপ চালু। পরবর্তী: ') + fmtDT(c.nextAt) : L('Automatic backup is OFF.', 'স্বয়ংক্রিয় ব্যাকআপ বন্ধ।'), 'success'); }).catch(failToast);
};
ACT['bk-now'] = function () {
  api('backupNow').then(function (c) { A.backup = c; A.bf = null; renderMain(); toast(L('Backup saved to Google Drive: ', 'Google Drive-এ ব্যাকআপ সেভ হয়েছে: ') + c.lastOkFile, 'success'); }).catch(failToast);
};
ACT['ex-scope'] = function (el) { A.exp.scope = el.getAttribute('data-s'); renderMain(); };
CH['ex'] = function (el) { A.exp[el.getAttribute('data-k')] = el.value; };
function doExport(params) {
  return api('exportData', params).then(function (r) { downloadText(r.fileName, r.json, 'application/json'); return r; });
}
ACT['ex-go'] = function () {
  doExport(A.exp).then(function (r) { toast(L('Downloaded: ', 'ডাউনলোড হয়েছে: ') + r.fileName, 'success'); }).catch(failToast);
};
CH['imp-file'] = function (el) {
  var f = el.files && el.files[0]; if (!f) return;
  if (f.size > 45 * 1024 * 1024) return toast(L('File is too large.', 'ফাইল অনেক বড়।'), 'error');
  var rd = new FileReader();
  rd.onload = function () {
    A.imp = { name: f.name, json: String(rd.result || ''), preview: null, mode: 'MERGE', sections: {}, pre: '', downloaded: false };
    api('importPreview', { json: A.imp.json }).then(function (p) {
      A.imp.preview = p;
      Object.keys(p.sections).forEach(function (k) { A.imp.sections[k] = k === 'products' || k === 'transactions' || k === 'activityLogs' || k === 'equipment' || k === 'equipTransactions'; });
      A.imp.pre = p.driveReady ? 'DRIVE' : 'DOWNLOADED';
      renderMain();
    }).catch(function (e) { A.imp.error = e.message; renderMain(); });
  };
  rd.readAsText(f);
};
var SEC_LABEL = { products: ['Products', 'প্রোডাক্ট'], transactions: ['Transactions', 'ট্রানজ্যাকশন'], activityLogs: ['Activity Logs', 'অ্যাক্টিভিটি লগ'], equipment: ['Equipment', 'ইকুইপমেন্ট'], equipTransactions: ['Equipment Entries', 'ইকুইপমেন্ট এন্ট্রি'], users: ['Users', 'ইউজার'], settings: ['Settings', 'সেটিংস'] };
function importPreviewHTML() {
  var im = A.imp;
  if (!im) return '';
  if (im.error) return `<div class="mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 font-semibold">${esc(im.error)}</div>`;
  var p = im.preview;
  if (!p) return loadingBlock();
  var m = p.meta;
  var secRows = Object.keys(p.sections).map(function (k) {
    var s = p.sections[k];
    return `<tr class="${TR}"><td class="${TD}"><label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" data-ch="imp-sec" data-k="${k}" ${im.sections[k] ? 'checked' : ''} class="w-4 h-4 accent-pink-600"><b>${L(SEC_LABEL[k][0], SEC_LABEL[k][1])}</b></label></td>
      <td class="${TD} text-right font-mono">${fmtN(s.total)}</td><td class="${TD} text-right font-mono text-emerald-600 font-bold">${fmtN(s.newCount)}</td><td class="${TD} text-right font-mono">${fmtN(s.duplicate)}</td><td class="${TD} text-right font-mono text-amber-600">${fmtN(s.conflict)}</td><td class="${TD} text-right font-mono text-rose-600">${fmtN(s.invalid)}</td></tr>`;
  }).join('');
  var ok = !p.errors.length;
  return `<div class="mt-3 space-y-3 text-xs">
    <div class="grid grid-cols-2 gap-2">${[[L('Backup type', 'ব্যাকআপ টাইপ'), esc(m.scope) + (m.from ? ' (' + esc(m.from) + ' → ' + esc(m.to) + ')' : '')], [L('Exported', 'এক্সপোর্ট'), fmtDT(m.exportedAt) + ' • ' + esc(m.exportedBy || '-')], [L('App version', 'অ্যাপ ভার্সন'), esc(m.appVersion) + ' / schema ' + esc(m.schema)], [L('Source database', 'উৎস ডাটাবেজ'), esc(m.database || '-')]].map(function (x) {
      return `<div class="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"><div class="text-[10px] text-slate-400 font-bold uppercase">${x[0]}</div><div class="font-bold">${x[1]}</div></div>`; }).join('')}</div>
    ${table(`<th class="${TH} text-left">${L('Section', 'অংশ')}</th><th class="${TH} text-right">${L('In file', 'ফাইলে')}</th><th class="${TH} text-right text-emerald-300">${L('New', 'নতুন')}</th><th class="${TH} text-right">${L('Duplicate', 'ডুপ্লিকেট')}</th><th class="${TH} text-right text-amber-200">${L('Conflict', 'কনফ্লিক্ট')}</th><th class="${TH} text-right text-rose-300">${L('Invalid', 'অবৈধ')}</th>`, secRows)}
    ${p.errors.map(function (e) { return `<div class="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-semibold">✕ ${esc(e)}</div>`; }).join('')}
    ${p.warnings.map(function (w) { return `<div class="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300">⚠ ${esc(w)}</div>`; }).join('')}
    ${ok ? `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
      <label class="p-3 rounded-xl border cursor-pointer ${im.mode === 'MERGE' ? 'border-pink-500 bg-pink-50/60 dark:bg-pink-950/30' : 'border-slate-200 dark:border-slate-700'}"><input type="radio" name="imp-mode" data-ch="imp-mode" value="MERGE" ${im.mode === 'MERGE' ? 'checked' : ''} class="accent-pink-600"> <b>${L('Merge', 'মার্জ')}</b><div class="text-[11px] text-slate-500 mt-1">${L('Add only missing records. Existing IDs are skipped — no duplicate transactions.', 'শুধু যা নেই তা যোগ হবে। একই আইডি বাদ যাবে — কোনো ডুপ্লিকেট ট্রানজ্যাকশন হবে না।')}</div></label>
      <label class="p-3 rounded-xl border cursor-pointer ${im.mode === 'REPLACE' ? 'border-rose-500 bg-rose-50/60 dark:bg-rose-950/30' : 'border-slate-200 dark:border-slate-700'}"><input type="radio" name="imp-mode" data-ch="imp-mode" value="REPLACE" ${im.mode === 'REPLACE' ? 'checked' : ''} class="accent-rose-600"> <b>${L('Full Restore (Replace)', 'সম্পূর্ণ রিস্টোর (রিপ্লেস)')}</b><div class="text-[11px] text-slate-500 mt-1">${L('Selected sections are replaced exactly with the file content.', 'নির্বাচিত অংশগুলো ফাইলের ডাটা দিয়ে হুবহু প্রতিস্থাপিত হবে।')}</div></label></div>
    <div class="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"><div class="font-bold mb-1.5">${L('Safety backup of the current database (required)', 'বর্তমান ডাটাবেজের নিরাপত্তা ব্যাকআপ (আবশ্যক)')}</div>
      ${p.driveReady ? `<label class="flex items-center gap-2 cursor-pointer mb-1"><input type="radio" name="imp-pre" data-ch="imp-pre" value="DRIVE" ${im.pre === 'DRIVE' ? 'checked' : ''} class="accent-pink-600">${L('Save automatically to the Google Drive folder before restoring', 'রিস্টোরের আগে স্বয়ংক্রিয়ভাবে Google Drive ফোল্ডারে সেভ করুন')}</label>` : ''}
      <label class="flex items-center gap-2 cursor-pointer"><input type="radio" name="imp-pre" data-ch="imp-pre" value="DOWNLOADED" ${im.pre === 'DOWNLOADED' ? 'checked' : ''} class="accent-pink-600">${L('Download it to this device first', 'আগে এই ডিভাইসে ডাউনলোড করুন')}</label>
      ${im.pre === 'DOWNLOADED' ? `<div class="mt-2 flex items-center gap-2">${btn(L('Download current full backup', 'বর্তমান সম্পূর্ণ ব্যাকআপ ডাউনলোড'), 'imp-predl', 'outline', 'download')}${im.downloaded ? '<span class="text-emerald-600 font-bold">✓ ' + L('Downloaded', 'ডাউনলোড হয়েছে') + '</span>' : ''}</div>` : ''}</div>
    <div class="flex justify-end gap-2">${btn(L('Cancel', 'বাতিল'), 'imp-cancel', 'ghost')}${btn(L('Restore Now', 'এখনই রিস্টোর'), 'imp-go', im.mode === 'REPLACE' ? 'danger' : 'primary', 'archive-restore', (im.pre === 'DOWNLOADED' && !im.downloaded) ? 'disabled' : '')}</div>` : `<div class="flex justify-end">${btn(L('Cancel', 'বাতিল'), 'imp-cancel', 'ghost')}</div>`}</div>`;
}
function rerenderImport() { var b = document.getElementById('imp-box'); if (b) b.innerHTML = importPreviewHTML(); }
CH['imp-sec'] = function (el) { A.imp.sections[el.getAttribute('data-k')] = el.checked; };
CH['imp-mode'] = function (el) { A.imp.mode = el.value; rerenderImport(); };
CH['imp-pre'] = function (el) { A.imp.pre = el.value; rerenderImport(); };
ACT['imp-cancel'] = function () { A.imp = null; renderMain(); };
ACT['imp-predl'] = function () { doExport({ scope: 'FULL' }).then(function () { A.imp.downloaded = true; rerenderImport(); toast(L('Safety backup downloaded.', 'নিরাপত্তা ব্যাকআপ ডাউনলোড হয়েছে।'), 'success'); }).catch(failToast); };
ACT['imp-go'] = function () {
  var im = A.imp, secs = Object.keys(im.sections).filter(function (k) { return im.sections[k]; });
  if (!secs.length) return toast(L('Select at least one section.', 'কমপক্ষে একটি অংশ নির্বাচন করুন।'), 'error');
  confirmBox({ title: L('Restore from backup', 'ব্যাকআপ থেকে রিস্টোর'), danger: im.mode === 'REPLACE', typeWord: 'RESTORE', okText: L('Restore', 'রিস্টোর'),
    message: (im.mode === 'REPLACE' ? L('REPLACE mode: these sections will be replaced exactly with the file — ', 'REPLACE মোড: এই অংশগুলো ফাইল দিয়ে হুবহু প্রতিস্থাপিত হবে — ') : L('MERGE mode: only missing records will be added — ', 'MERGE মোড: শুধু অনুপস্থিত রেকর্ড যোগ হবে — ')) + '<b>' + secs.map(function (k) { return L(SEC_LABEL[k][0], SEC_LABEL[k][1]); }).join(', ') + '</b>',
    onOk: function () {
      pinApi('importApply', { json: im.json, mode: im.mode, sections: im.sections, preBackup: im.pre }, function (r) {
        setBoot(r.boot); A.imp = null; A.backup = null;
        var msg = Object.keys(r.result).map(function (k) { return L(SEC_LABEL[k][0], SEC_LABEL[k][1]) + ': +' + r.result[k].written + (r.result[k].skipped ? ' (' + L('skipped', 'বাদ') + ' ' + r.result[k].skipped + ')' : ''); }).join(', ');
        toast(L('Restore complete — ', 'রিস্টোর সম্পন্ন — ') + msg, 'success');
        render(); VIEW_LOAD.admin();
      });
    } });
};

/* =====================================================================
 *  5. SYSTEM SETTINGS (store name, units, categories, logo, old data migration, system info)
 * ===================================================================== */
function setState() {
  return A.set || (A.set = { storeName: S.boot.settings.storeName, units: S.boot.settings.units.slice(), categories: S.boot.settings.categories.slice() });
}
function setChips(key) {
  var st = setState();
  {
    return `<div class="flex flex-wrap gap-1.5 mb-2">${st[key].map(function (u, i) { return `<span class="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold">${esc(u)}<button type="button" data-act="set-rm" data-k="${key}" data-i="${i}" class="p-0.5 rounded-full hover:bg-rose-100 hover:text-rose-600 cursor-pointer">${ic('x', 'w-3 h-3')}</button></span>`; }).join('') || '<span class="text-[11px] text-slate-400">—</span>'}</div>
      <div class="flex gap-1.5"><input id="set-add-${key}" data-kd="set-add" data-k="${key}" maxlength="40" placeholder="${L('Add new…', 'নতুন যোগ করুন…')}" class="${INP}">${btn(L('Add', 'যোগ'), 'set-add', 'soft', 'plus', 'data-k="' + key + '"')}</div>`;
  }
}
function adminCatUnit() {
  var chips = setChips;
  return `<div class="grid grid-cols-1 xl:grid-cols-2 gap-2">${card(L('Categories', 'ক্যাটাগরি'), '', chips('categories'))}${card(L('Units', 'ইউনিট'), '', chips('units'))}</div>
    <div class="flex justify-end mt-2">${btn(L('Save', 'সেভ'), 'set-save', 'primary', 'save')}</div>`;
}
function applySettings(s) { takeLogo(s); S.boot.settings = s; }
function adminStore() {
  var st = setState(), folderId = (S.boot.admin && S.boot.admin.driveFolder) || '', set = !!(S.boot.settings && S.boot.settings.driveFolderSet);
  var settings = card(L('Store / App Name', 'স্টোর / অ্যাপের নাম'), '',
    `<div class="flex gap-1.5"><input id="set-name" maxlength="60" value="${esc(st.storeName)}" data-in="set-name" class="${INP}">${btn(L('Save', 'সেভ'), 'set-save', 'primary', 'save')}</div>`);
  var logo = card(L('Logo', 'লোগো'), L('Pick a picture, or paste an image link. No Google Drive folder is needed. The logo appears on the top bar and on every report header.', 'ছবি বেছে নিন, অথবা ছবির লিংক দিন। এর জন্য Google Drive ফোল্ডার লাগে না। লোগো উপরের বারে ও প্রতিটি রিপোর্টের হেডারে দেখাবে।'),
    `<div class="flex items-center gap-3"><img src="${esc(logoUrl())}" onerror="this.onerror=null;this.src=DEFAULT_LOGO" class="w-16 h-16 rounded-full border border-pink-300 bg-white p-1 object-contain">
    <div class="flex flex-wrap gap-2"><label class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-pink-600 hover:bg-pink-700 text-white cursor-pointer">${ic('upload', 'w-3.5 h-3.5')}${L('Upload logo', 'লোগো আপলোড')}<input type="file" accept="image/*" data-ch="logo-file" class="hidden"></label>
    ${btn(L('Use default', 'ডিফল্ট ব্যবহার'), 'logo-reset', 'ghost', 'rotate-ccw')}</div></div>
    <div class="mt-3"><div class="text-[11px] font-semibold text-slate-500 mb-1">${L('Or logo link (https://… — a Google Drive share link also works)', 'অথবা লোগোর লিংক (https://… — Google Drive শেয়ার লিংকও চলবে)')}</div>
    <div class="flex gap-1.5"><input id="logo-link" value="${esc((S.boot.settings && S.boot.settings.logoLink) || '')}" placeholder="https://..." class="${INP} font-mono text-xs">${btn(L('Use link', 'লিংক ব্যবহার'), 'logo-link', 'primary', 'link')}</div></div>`);
  var drive = card(L('Google Drive Folder', 'Google Drive ফোল্ডার'), L('Backups are saved in this folder (Backup → Google Drive Backup). Paste the folder link or ID; the folder must be in the Google account that owns this script.', 'ব্যাকআপ এই ফোল্ডারে সেভ হয়। ফোল্ডারের লিংক বা আইডি দিন; ফোল্ডারটি এই স্ক্রিপ্টের মালিকের Google অ্যাকাউন্টে থাকতে হবে।'),
    `<div class="flex gap-1.5"><input id="drv-folder" value="${esc(folderId)}" placeholder="https://drive.google.com/drive/folders/..." class="${INP} font-mono text-xs">${btn(L('Save', 'সেভ'), 'drv-save', 'primary', 'save')}</div>
    <p class="mt-2 text-[11px] font-semibold ${A.driveName || set ? 'text-emerald-600' : 'text-amber-600'}">${A.driveName ? '✓ ' + esc(A.driveName) : set ? '✓ ' + L('Folder is set.', 'ফোল্ডার সেট আছে।') : L('No folder set — Drive backup cannot run until you set one.', 'কোনো ফোল্ডার সেট নেই — ফোল্ডার না দিলে Drive ব্যাকআপ চলবে না।')}</p>`);
  return `<div class="grid grid-cols-1 xl:grid-cols-2 gap-2">${settings}${drive}${logo}</div>`;
}
/** big photo → small logo (kept in the database itself, so it loads fast everywhere) */
function shrinkLogo(img) {
  var iw = img.width || 160, ih = img.height || 160, sizes = [160, 128, 96, 64];
  for (var i = 0; i < sizes.length; i++) {
    var sc = Math.min(1, sizes[i] / Math.max(iw, ih)), w = Math.max(1, Math.round(iw * sc)), h = Math.max(1, Math.round(ih * sc));
    var c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
    var png = c.toDataURL('image/png'); if (png.length <= 40000) return png;
    var jpg = c.toDataURL('image/jpeg', 0.85); if (jpg.length <= 40000) return jpg;
  }
  return '';
}
ACT['drv-save'] = function () {
  api('driveFolderSave', { folder: val('drv-folder').trim() }).then(function (c) {
    A.backup = c; A.driveName = c.folderName || ''; S.boot.admin.driveFolder = c.folderId || ''; S.boot.settings.driveFolderSet = !!c.folderId; renderMain();
    toast(c.folderName ? L('Folder saved: ', 'ফোল্ডার সেভ: ') + c.folderName : L('Folder removed.', 'ফোল্ডার মুছে ফেলা হয়েছে।'), 'success');
  }).catch(failToast);
};
function adminReset() {
  var r = A.reset || (A.reset = { ready: false, at: 0, withProducts: false, word: '' });
  if (r.ready && Date.now() - r.at > 30 * 60 * 1000) r.ready = false;   // the server accepts a backup made in the last 30 minutes
  var step = function (n, done, title, inner) {
    return `<div class="flex gap-2.5"><div class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black ${done ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200'}">${done ? '✓' : n}</div>
      <div class="flex-1 min-w-0"><div class="text-xs font-bold text-slate-800 dark:text-slate-100">${title}</div>${inner}</div></div>`;
  };
  return card(L('Reset System', 'সিস্টেম রিসেট'), '', `<div class="space-y-3 max-w-2xl">
    <div class="flex gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-[11px]">${ic('triangle-alert', 'w-4 h-4 shrink-0')}<span>${L('This deletes ALL transactions, stock history and activity logs. Users, PINs and settings are kept. It cannot be undone — keep the downloaded JSON file safe.', 'এটি সব ট্রানজ্যাকশন, স্টক হিস্টোরি ও অ্যাক্টিভিটি লগ মুছে দেবে। ইউজার, পিন ও সেটিংস থাকবে। এটি ফেরানো যাবে না — ডাউনলোড করা JSON ফাইলটি নিরাপদে রাখুন।')}</span></div>
    ${step(1, r.ready, L('Download the full Lifetime JSON backup (required)', 'সম্পূর্ণ লাইফটাইম JSON ব্যাকআপ ডাউনলোড করুন (আবশ্যক)'), `<div class="mt-1.5 flex flex-wrap items-center gap-2">${btn(L('Download full JSON backup', 'সম্পূর্ণ JSON ব্যাকআপ ডাউনলোড'), 'rs-backup', r.ready ? 'outline' : 'success', 'download')}${r.ready ? `<span class="text-[11px] font-semibold text-emerald-600">✓ ${L('Downloaded — Reset is now allowed for 30 minutes.', 'ডাউনলোড হয়েছে — এখন ৩০ মিনিট রিসেট করা যাবে।')}</span>` : ''}</div>`)}
    ${step(2, false, L('Options', 'অপশন'), `<label class="mt-1.5 flex items-center gap-2 text-xs cursor-pointer"><input type="checkbox" data-ch="rs-prod" ${r.withProducts ? 'checked' : ''} class="w-4 h-4 accent-pink-600"><span>${L('Also delete all products (start with an empty product list)', 'প্রোডাক্ট তালিকাও মুছুন (খালি প্রোডাক্ট তালিকা দিয়ে শুরু)')}</span></label>`)}
    ${step(3, false, L('Type RESET, then confirm with the Admin PIN', 'RESET লিখুন, তারপর অ্যাডমিন পিন দিন'), `<div class="mt-1.5 flex flex-wrap items-center gap-2"><input id="rs-word" data-in="rs-word" value="${esc(r.word)}" maxlength="5" autocomplete="off" placeholder="RESET" class="${INP} font-mono font-bold w-28 uppercase">${btn(L('Reset Now', 'এখনই রিসেট'), 'rs-go', 'danger', 'trash-2', r.ready && r.word === 'RESET' ? '' : 'disabled')}</div>`)}
  </div>`);
}
function rsSync() { var r = A.reset, bt = document.querySelector('[data-act="rs-go"]'); if (bt && r) bt.disabled = !(r.ready && r.word === 'RESET'); }
IN['rs-word'] = function (el) { A.reset.word = el.value.trim().toUpperCase(); rsSync(); };
CH['rs-prod'] = function (el) { A.reset.withProducts = el.checked; };
ACT['rs-backup'] = function () {
  doExport({ scope: 'FULL' }).then(function (r) { A.reset.ready = true; A.reset.at = Date.now(); renderMain(); toast(L('Downloaded: ', 'ডাউনলোড হয়েছে: ') + r.fileName, 'success'); }).catch(failToast);
};
ACT['rs-go'] = function () {
  var r = A.reset; if (!r || !r.ready || r.word !== 'RESET') return;
  confirmBox({ title: L('Reset System', 'সিস্টেম রিসেট'), danger: true, okText: L('Reset', 'রিসেট'),
    message: L('All transactions, stock history and activity logs will be deleted', 'সব ট্রানজ্যাকশন, স্টক হিস্টোরি ও অ্যাক্টিভিটি লগ মুছে যাবে') + (r.withProducts ? L(', and all products.', ' এবং সব প্রোডাক্ট।') : L('. Products stay.', '। প্রোডাক্ট থাকবে।')),
    onOk: function () {
      pinApi('resetAll', { confirm: 'RESET', products: !!r.withProducts }, function (res) {
        A.reset = null; S.entry = null; S.hist = null; S.logs = null; S.stock.rep = null; S.dash = null; setBoot(res.boot); renderMain();
        toast(L('System reset done.', 'সিস্টেম রিসেট সম্পন্ন।'), 'success');
      });
    } });
};
function adminSysInfo() {
  var sy = A.sys;
  var sys = card(L('System Information', 'সিস্টেম তথ্য'), '', sy ? `<div class="text-xs space-y-2"><div class="grid grid-cols-2 md:grid-cols-4 gap-2">${[[L('Database sheet', 'ডাটাবেজ শিট'), `<a href="${esc(sy.spreadsheetUrl)}" target="_blank" class="text-pink-600 underline">${esc(sy.spreadsheet)}</a>`], [L('App version', 'অ্যাপ ভার্সন'), esc(sy.version)], [L('Time zone', 'টাইম জোন'), esc(sy.timeZone)], [L('Server time', 'সার্ভার সময়'), fmtDT(sy.serverTime)]].map(function (x) {
      return `<div class="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"><div class="text-[10px] text-slate-400 font-bold uppercase">${x[0]}</div><div class="font-bold break-all">${x[1]}</div></div>`; }).join('')}</div>
    ${table(`<th class="${TH} text-left">${L('Database table (sheet)', 'ডাটাবেজ টেবিল (শিট)')}</th><th class="${TH} text-right">${L('Rows', 'সারি')}</th>`, sy.sheets.map(function (s) { return `<tr class="${TR}"><td class="${TD} font-mono">${esc(s.sheet)}</td><td class="${TD} text-right font-mono font-bold">${fmtN(s.rows)}</td></tr>`; }).join(''))}
    <div class="flex justify-end">${btn(L('Check / Repair Database', 'ডাটাবেজ চেক / রিপেয়ার'), 'sys-repair', 'outline', 'shield-check')}</div></div>` : loadingBlock());
  return sys;
}
IN['set-name'] = function (el) { setState().storeName = el.value; };
function setAdd(key) {
  var inp = document.getElementById('set-add-' + key), v = inp ? inp.value.trim() : '';
  if (!v) return;
  var st = setState();
  if (st[key].some(function (x) { return x.toLowerCase() === v.toLowerCase(); })) return toast(L('Already in the list.', 'তালিকায় আগে থেকেই আছে।'), 'error');
  st[key].push(v); renderMain();
  var n = document.getElementById('set-add-' + key); if (n) n.focus();
}
ACT['set-add'] = function (el) { setAdd(el.getAttribute('data-k')); };
KD['set-add'] = function (el, e) { if (e.key === 'Enter') { e.preventDefault(); setAdd(el.getAttribute('data-k')); } };
ACT['set-rm'] = function (el) { setState()[el.getAttribute('data-k')].splice(Number(el.getAttribute('data-i')), 1); renderMain(); };
ACT['set-save'] = function () {
  api('settingsSave', setState()).then(function (s) { applySettings(s); A.set = null; render(); toast(L('Settings saved.', 'সেটিংস সেভ হয়েছে।'), 'success'); }).catch(failToast);
};
CH['logo-file'] = function (el) {
  var f = el.files && el.files[0]; if (!f) return;
  el.value = '';
  if (f.size > 8 * 1024 * 1024) return toast(L('Picture is too large (max 8 MB).', 'ছবি অনেক বড় (সর্বোচ্চ ৮ MB)।'), 'error');
  var rd = new FileReader();
  rd.onload = function () {
    var img = new Image();
    img.onload = function () {
      var out = shrinkLogo(img);
      if (!out) return toast(L('Could not make this picture small enough. Try a simpler logo.', 'ছবিটি যথেষ্ট ছোট করা গেল না। সাধারণ একটি লোগো দিন।'), 'error');
      api('logoSave', { dataUrl: out }).then(function (s) { CACHE = {}; applySettings(s); render(); toast(L('Logo saved.', 'লোগো সেভ হয়েছে।'), 'success'); }).catch(failToast);
    };
    img.onerror = function () { toast(L('Could not read this picture.', 'ছবিটি পড়া যায়নি।'), 'error'); };
    img.src = String(rd.result);
  };
  rd.readAsDataURL(f);
};
ACT['logo-link'] = function () {
  var u = val('logo-link').trim(); if (!u) return toast(L('Paste the logo link first.', 'আগে লোগোর লিংক দিন।'), 'error');
  api('logoSave', { url: u }).then(function (s) { applySettings(s); render(); toast(L('Logo saved.', 'লোগো সেভ হয়েছে।'), 'success'); }).catch(failToast);
};
ACT['logo-reset'] = function () { api('logoSave', {}).then(function (s) { applySettings(s); render(); toast(L('Default logo restored.', 'ডিফল্ট লোগো ফিরে এসেছে।'), 'success'); }).catch(failToast); };
ACT['sys-repair'] = function () { api('repairDatabase').then(function (d) { A.sys = d; renderMain(); toast(L('Database checked — all sheets OK.', 'ডাটাবেজ চেক সম্পন্ন — সব শিট ঠিক আছে।'), 'success'); }).catch(failToast); };

/* =====================================================================
 *  EQUIPMENT MANAGEMENT — Equipment Stock • Equipment IN / OUT / Damage • Equipment History • Admin list
 *  (Materials থেকে সম্পূর্ণ আলাদা ডাটাবেস টেবিল; সব আচরণ Materials-এর মতোই)
 * ===================================================================== */
S.kind = LS.get('scs_store_kind', 'MAT') === 'EQP' ? 'EQP' : 'MAT';
S.eq = { data: null, sig: '', entry: null, hist: null, stock: { q: '', f: '' } };
ICONS['wrench'] = ICONS['wrench'] || '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>';
ICONS['hammer'] = ICONS['hammer'] || ICONS['wrench'];
ICONS['shield-alert'] = ICONS['shield-alert'] || '';
function eqS() { return S.eq; }
function eqRows() { return S.eq.data ? S.eq.data.rows : []; }
function eqById(id) { return eqRows().filter(function (x) { return x.id === id; })[0] || null; }
function eqLabel(e) { return e.code + ' • ' + e.name + (e.brand ? ' • ' + e.brand : '') + (e.model ? ' • ' + e.model : ''); }
/** load / refresh the equipment list; the page is repainted only when something really changed (never while typing) */
function eqLoad() {
  return swr('equipStock', {}, function (d) {
    var sig = JSON.stringify(d.rows) + JSON.stringify(d.lastBatch), first = !S.eq.data;
    S.eq.data = d;
    if (!first && sig === S.eq.sig) return;
    S.eq.sig = sig;
    if (S.view === 'eqstock' || (S.view === 'entry' && S.kind === 'EQP')) softRender();
    else if (S.view === 'admin' && S.adminTab === 'equipment') adminRefresh();
    else if (S.view === 'history' && S.kind === 'EQP') eqHistPaint();
  }).catch(failToast);
}
function eqSet(stock) { CACHE = {}; if (stock) { S.eq.data = stock; S.eq.sig = JSON.stringify(stock.rows) + JSON.stringify(stock.lastBatch); } }

/* ---------- Materials | Equipment switch (inside Stock IN/OUT and Transaction History) ---------- */
function kindTabs() {
  var mk = function (k, label, icon) {
    var a = S.kind === k;
    return '<button type="button" data-act="kind" data-k="' + k + '" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all active:scale-95 ' +
      (a ? 'bg-pink-600 text-white shadow-xs' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700') + '">' + ic(icon, 'w-3.5 h-3.5') + '<span>' + label + '</span></button>';
  };
  return '<div class="no-print flex items-center gap-1.5 mb-2">' + mk('MAT', L('Materials', 'ম্যাটেরিয়ালস'), 'package') + mk('EQP', L('Equipment', 'ইকুইপমেন্ট'), 'wrench') + '</div>';
}
ACT['kind'] = function (el) {
  S.kind = el.getAttribute('data-k') === 'EQP' ? 'EQP' : 'MAT'; LS.set('scs_store_kind', S.kind);
  renderMain(); if (VIEW_LOAD[S.view]) VIEW_LOAD[S.view]();
};
(function () {
  var entryR = VIEW_RENDER.entry, histR = VIEW_RENDER.history, histL = VIEW_LOAD.history;
  VIEW_RENDER.entry = function () { return kindTabs() + (S.kind === 'EQP' ? eqEntryHTML() : entryR()); };
  VIEW_LOAD.entry = function () { if (S.kind === 'EQP') eqLoad(); };
  VIEW_RENDER.history = function () { return kindTabs() + (S.kind === 'EQP' ? eqHistHTML() : histR()); };
  VIEW_LOAD.history = function () { if (S.kind === 'EQP') { eqLoad(); return eqHistLoad(); } return histL(); };
  var oph = openProductHistory;
  openProductHistory = function (pid) { S.kind = 'MAT'; LS.set('scs_store_kind', 'MAT'); oph(pid); };
})();

/* ---------- 1. EQUIPMENT STOCK TABLE ---------- */
function eqStatusInfo(r) {
  if (r.qty <= 0 && r.dmg <= 0) return { t: L('Out of stock', 'স্টক নেই'), c: 'text-slate-500' };
  if (r.dmg <= 0) return { t: L('OK', 'ঠিক আছে'), c: 'text-emerald-600 dark:text-emerald-400' };
  if (r.net <= 0) return { t: L('Damaged', 'ড্যামেজ'), c: 'text-rose-600' };
  return { t: L('Part damaged', 'আংশিক ড্যামেজ'), c: 'text-amber-600 dark:text-amber-400' };
}
function eqFiltered() {
  var s = S.eq.stock, q = s.q.trim().toLowerCase(), words = q ? q.split(/\s+/) : [];
  return eqRows().filter(function (r) {
    if (s.f === 'DMG' && !(r.dmg > 0)) return false;
    if (s.f === 'OK' && r.dmg > 0) return false;
    if (s.f === 'INACTIVE' && r.status === 'ACTIVE') return false;
    if (words.length) { var h = (r.code + ' ' + r.name + ' ' + r.brand + ' ' + r.model + ' ' + r.unit).toLowerCase(); return words.every(function (w) { return h.indexOf(w) >= 0; }); }
    return true;
  });
}
function eqTableHTML() {
  if (!S.eq.data) return loadingBlock();
  var rows = eqFiltered(), t = { q: 0, d: 0, n: 0 };
  var body = rows.map(function (r, i) {
    t.q += r.qty; t.d += r.dmg; t.n += r.net;
    var st = eqStatusInfo(r);
    return `<tr class="${TR}${r.status !== 'ACTIVE' ? ' opacity-60' : ''}">
      <td class="${TD} text-center text-slate-500 font-mono">${i + 1}</td>
      <td class="${TD} text-center whitespace-nowrap">${fmtD(r.date)}</td>
      <td class="${TD} font-semibold"><button type="button" data-act="eq-hist" data-id="${esc(r.id)}" class="text-left hover:underline cursor-pointer">${esc(r.name)}</button>${r.status !== 'ACTIVE' ? ` <span class="ml-1 text-[9px] px-1 py-0.5 bg-slate-200 dark:bg-slate-700 rounded font-bold">${L('Inactive', 'নিষ্ক্রিয়')}</span>` : ''}</td>
      <td class="${TD} text-center">${esc(r.brand || '-')}</td>
      <td class="${TD} text-center">${esc(r.model || '-')}</td>
      <td class="${TD} text-center font-mono font-bold whitespace-nowrap">${esc(r.code)}</td>
      <td class="${TD} text-center font-mono font-bold eq-qty">${fmtN(r.qty)}</td>
      <td class="${TD} text-center font-bold ${st.c}">${st.t}</td>
      <td class="${TD} text-center font-mono font-black stk-cur bg-cyan-50 dark:bg-cyan-950/30">${fmtN(r.net)}</td>
      <td class="${TD} text-center">${r.dmg > 0 ? `<div class="font-mono font-black text-rose-600 eq-dmg">${fmtN(r.dmg)}</div>${r.reason ? `<div class="text-[10px] leading-tight text-slate-500 dark:text-slate-400 max-w-44 mx-auto">${esc(r.reason)}</div>` : ''}` : '<span class="text-slate-300">-</span>'}</td></tr>`;
  }).join('');
  var head = `<th class="${TH} w-10">SL</th><th class="${TH}">${L('Date', 'তারিখ')}</th><th class="${TH} text-left">${L('Product Name', 'প্রোডাক্ট নাম')}</th><th class="${TH}">${L('Brand Name', 'ব্র্যান্ড নাম')}</th><th class="${TH}">${L('Model Number', 'মডেল নম্বর')}</th><th class="${TH}">${L('SCS ID Number', 'SCS আইডি নম্বর')}</th><th class="${TH}">${L('Quantity', 'পরিমাণ')}</th><th class="${TH}">${L('Status', 'স্ট্যাটাস')}</th><th class="${TH} font-black bg-slate-900 stk-cur-h">${L('Net Quantity', 'নেট পরিমাণ')}</th><th class="${TH}">${L('Status Explain', 'স্ট্যাটাস ব্যাখ্যা')}</th>`;
  var foot = `<tr class="bg-slate-100 dark:bg-slate-800"><td colspan="6" class="${TF} text-center font-sans">${L('TOTAL', 'মোট')} = ${rows.length} ${L('items', 'আইটেম')}</td><td class="${TF} text-center">${fmtN(t.q)}</td><td class="${TF}"></td><td class="${TF} text-center stk-cur">${fmtN(t.n)}</td><td class="${TF} text-center text-rose-600">${t.d ? fmtN(t.d) : ''}</td></tr>` + wordsRow(10, t.n);
  return table(head, body || emptyRow(10, L('No equipment yet. Add it from Admin → Equipment.', 'এখনো কোনো ইকুইপমেন্ট নেই। Admin → Equipment থেকে যোগ করুন।')), foot);
}
VIEW_LOAD.eqstock = function () { eqLoad(); };
VIEW_RENDER.eqstock = function () {
  var s = S.eq.stock, d = S.eq.data, sum = d ? d.sum : { items: 0, qty: 0, dmg: 0, net: 0, damagedItems: 0 };
  var tools = searchBox('data-in="eq-q"', s.q, L('Search ID / name / brand / model', 'আইডি / নাম / ব্র্যান্ড / মডেল খুঁজুন')) +
    `<select data-ch="eq-f" class="${SELC}">${opt('', L('All items', 'সব আইটেম'), s.f)}${opt('DMG', L('Damaged only', 'শুধু ড্যামেজ'), s.f)}${opt('OK', L('No damage', 'ড্যামেজ নেই'), s.f)}${opt('INACTIVE', L('Inactive', 'নিষ্ক্রিয়'), s.f)}</select>` +
    chip(sum.items + ' ' + L('items', 'আইটেম'), 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700') +
    chip(L('Net: ', 'নেট: ') + fmtN(sum.net), 'bg-cyan-50 dark:bg-cyan-950/50 text-sky-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800') +
    (sum.dmg ? chip(L('Damaged: ', 'ড্যামেজ: ') + fmtN(sum.dmg), 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800') : '');
  return reportShell({ tools: tools, actions: [actPrint(), actCsv('eq-csv')], printTitle: 'EQUIPMENT STOCK — ' + fmtD(today()).toUpperCase(), body: `<div id="eq-table">${eqTableHTML()}</div>` });
};
IN['eq-q'] = function (el) { S.eq.stock.q = el.value; var t = document.getElementById('eq-table'); if (t) t.innerHTML = eqTableHTML(); };
CH['eq-f'] = function (el) { S.eq.stock.f = el.value; var t = document.getElementById('eq-table'); if (t) t.innerHTML = eqTableHTML(); };
ACT['eq-csv'] = function () {
  downloadCsv('SCS_Equipment_Stock_' + today(), ['SL', 'Date', 'Product Name', 'Brand Name', 'Model Number', 'SCS ID Number', 'Quantity', 'Status', 'Net Quantity', 'Damaged', 'Damage Reason'],
    eqFiltered().map(function (r, i) { return [i + 1, r.date, r.name, r.brand, r.model, r.code, r.qty, eqStatusInfo(r).t, r.net, r.dmg, r.reason]; }));
};
/** equipment name → its history */
ACT['eq-hist'] = function (el) {
  S.kind = 'EQP'; LS.set('scs_store_kind', 'EQP');
  S.eq.hist = null; var h = eqHist(); h.f.equipId = el.getAttribute('data-id'); setPeriod(h.f, 'all');
  go('history');
};

/* ---------- 2. EQUIPMENT IN / OUT / DAMAGE / REPAIRED ---------- */
function eqNewRow() { return { id: uid(), eid: '', text: '', q: '', why: '' }; }
function eqEntry() {
  if (!S.eq.entry) S.eq.entry = { date: today(), remarks: '', rows: [eqNewRow(), eqNewRow(), eqNewRow()], reqId: uid() };
  return S.eq.entry;
}
var EQ_TYPE_UI = {
  IN: ['Stock IN', 'স্টক ইন', '#059669'], OUT: ['Stock OUT', 'স্টক আউট', '#e11d48'],
  DAMAGE: ['Damage', 'ড্যামেজ', '#f59e0b'], REPAIRED: ['Repaired', 'ঠিক হয়েছে', '#0284c7']
};
function eqEntryHTML() {
  var e = eqEntry(), d = S.eq.data, lb = d && d.lastBatch && d.lastBatch.length ? d.lastBatch : null;
  var last = lb ? (function () {
    var t = lb[0];
    return `<div class="no-print flex items-start gap-2 rounded-lg px-2.5 py-1.5 mb-2 bg-slate-900 text-white border border-slate-700/60 text-[11px]">
      <div class="w-2 h-2 mt-1 rounded-full ${t.type === 'IN' ? 'bg-emerald-400' : t.type === 'OUT' ? 'bg-rose-400' : t.type === 'DAMAGE' ? 'bg-amber-400' : 'bg-sky-400'} shrink-0"></div>
      <div class="min-w-0 flex-1"><div class="flex flex-wrap items-center gap-x-2 gap-y-0.5"><span class="text-slate-400 font-semibold" style="margin-right:6px">${L('Last entry', 'শেষ এন্ট্রি')}</span>${badgeType(t.type)}<span class="text-slate-400">${fmtD(t.date)} ${esc(String(t.time).slice(0, 5))} • ${esc(t.user)}</span></div>
      <div class="mt-0.5 text-slate-300 leading-snug">${lb.slice(0, 4).map(function (x) { return `<span class="inline-block" style="margin-right:14px"><b class="font-mono text-pink-300">${esc(x.code)}</b> ${esc(x.name)} <b class="font-mono text-amber-300">× ${fmtN(x.qty)}</b></span>`; }).join('')}${lb.length > 4 ? '…' : ''}</div></div>
      <button type="button" data-act="eq-last" class="px-2 py-0.5 rounded-md font-bold bg-white/10 hover:bg-white/20 border border-white/20 cursor-pointer shrink-0 flex items-center gap-1">${ic('eye', 'w-3 h-3')}${L('View', 'দেখুন')}</button></div>`;
  })() : '';
  var dl = eqRows().filter(function (r) { return r.status === 'ACTIVE'; }).map(function (r) { return '<option value="' + esc(eqLabel(r)) + '"></option>'; }).join('');
  var btns = ['IN', 'OUT', 'DAMAGE', 'REPAIRED'].map(function (k) {
    return `<button type="button" data-act="eq-submit" data-type="${k}" style="background:${EQ_TYPE_UI[k][2]}" class="py-2 rounded-lg text-xs sm:text-sm font-black text-white shadow-sm active:scale-95 transition-all cursor-pointer">${L(EQ_TYPE_UI[k][0], EQ_TYPE_UI[k][1])}</button>`;
  }).join('');
  var body = last + `<datalist id="eq-dl">${dl}</datalist>
    <div class="flex flex-wrap items-center gap-1.5 mb-2">
      <div class="flex items-center gap-1 shrink-0">${ic('calendar', 'w-3.5 h-3.5 text-indigo-600')}<input type="date" id="eqe-date" data-ch="eqe-date" max="${today()}" value="${esc(e.date)}" class="${SELC}"></div>
      <input type="text" id="eqe-remarks" data-in="eqe-remarks" maxlength="300" value="${esc(e.remarks)}" placeholder="${L('Reference / Remarks (optional)', 'রেফারেন্স / মন্তব্য (ঐচ্ছিক)')}" class="${INP} flex-1 min-w-40">
    </div>
    <div id="eqe-rows">${eqRowsHTML()}</div>
    <div class="no-print scs-entry-bar sticky bottom-0 mt-2 -mx-2 sm:-mx-2.5 px-2 sm:px-2.5 py-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-t border-slate-200 dark:border-slate-800 rounded-b-xl">
      <div class="grid grid-cols-2 sm:grid-cols-6 gap-1.5">
        <button type="button" data-act="eqe-add" class="py-2 rounded-lg text-xs sm:text-sm font-bold bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-300 border border-pink-300 dark:border-pink-800 hover:bg-pink-100 active:scale-95 transition-all cursor-pointer">+ ${L('Add Row', 'সারি যোগ')}</button>
        <button type="button" data-act="eqe-clear" class="py-2 rounded-lg text-xs sm:text-sm font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer">${L('Clear', 'মুছুন')}</button>${btns}
      </div></div>`;
  return `<div class="scs-entry">${reportShell({ body: body })}</div>`;
}
function eqRowsHTML() {
  var e = eqEntry(), n = 0;
  var rows = e.rows.map(function (r, i) {
    var q = r.eid ? eqById(r.eid) : null; if (q && Number(r.q) > 0) n++;
    return `<div class="flex flex-wrap items-center gap-1.5 p-1.5 border-b border-slate-200 dark:border-slate-700 even:bg-slate-50/50 dark:even:bg-slate-800/30" data-row="${r.id}">
      <div class="w-5 text-center text-slate-500 font-mono text-xs">${i + 1}</div>
      <input type="text" list="eq-dl" autocomplete="off" data-in="eq-pick" data-row="${r.id}" value="${esc(r.text)}" placeholder="${L('Select / search equipment (ID, name, brand, model)', 'ইকুইপমেন্ট বাছুন / খুঁজুন (আইডি, নাম, ব্র্যান্ড, মডেল)')}" class="scs-inp flex-1 min-w-52 px-2 py-1.5 rounded-md border ${q ? 'border-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'} text-sm font-semibold focus:outline-hidden focus:border-pink-500">
      <div class="text-[11px] font-mono font-bold text-slate-500 min-w-28 text-center">${q ? `${L('Qty', 'পরিমাণ')} ${fmtN(q.qty)} • <span class="text-rose-600">${L('Dmg', 'ড্যামেজ')} ${fmtN(q.dmg)}</span> • <span class="text-sky-700 dark:text-cyan-300">${L('Net', 'নেট')} ${fmtN(q.net)}</span>` : ''}</div>
      <input type="number" inputmode="decimal" step="any" min="0" data-in="eq-qty" data-row="${r.id}" value="${esc(r.q)}" placeholder="${L('Qty', 'পরিমাণ')}" class="scs-inp w-24 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-black font-mono text-center focus:outline-hidden focus:border-pink-500">
      <input type="text" maxlength="300" data-in="eq-why" data-row="${r.id}" value="${esc(r.why)}" placeholder="${L('Reason (must for Damage)', 'কারণ (ড্যামেজে আবশ্যক)')}" class="scs-inp flex-1 min-w-44 px-2 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:outline-hidden focus:border-amber-500">
      <button type="button" data-act="eqe-del" data-row="${r.id}" title="${L('Remove row', 'সারি মুছুন')}" class="p-1 rounded-md text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer">${ic('x', 'w-4 h-4')}</button></div>`;
  }).join('');
  return `<div class="border border-slate-700 dark:border-slate-400 rounded-lg">${rows}<div class="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-xs font-extrabold text-right">${L('Items', 'আইটেম')}: ${n}</div></div>`;
}
function eqEntryRow(id) { return eqEntry().rows.filter(function (r) { return r.id === id; })[0]; }
function eqRerender() { var c = document.getElementById('eqe-rows'); if (c) c.innerHTML = eqRowsHTML(); }
IN['eq-pick'] = function (el) {
  var r = eqEntryRow(el.getAttribute('data-row')); if (!r) return;
  r.text = el.value;
  var hit = eqRows().filter(function (x) { return x.status === 'ACTIVE' && eqLabel(x) === el.value; })[0];
  var was = r.eid; r.eid = hit ? hit.id : '';
  if (was !== r.eid) { var rowEl = el.closest('[data-row]'); eqRerender(); var f = document.querySelector('[data-row="' + r.id + '"] [data-in="eq-qty"]'); if (f && hit) f.focus(); }
};
IN['eq-qty'] = function (el) { var r = eqEntryRow(el.getAttribute('data-row')); if (r) r.q = el.value; };
IN['eq-why'] = function (el) { var r = eqEntryRow(el.getAttribute('data-row')); if (r) r.why = el.value; };
IN['eqe-remarks'] = function (el) { eqEntry().remarks = el.value; };
CH['eqe-date'] = function (el) { eqEntry().date = el.value || today(); };
ACT['eqe-add'] = function () { eqEntry().rows.push(eqNewRow()); eqRerender(); };
ACT['eqe-del'] = function (el) {
  var e = eqEntry(), id = el.getAttribute('data-row');
  e.rows = e.rows.length === 1 ? [eqNewRow()] : e.rows.filter(function (r) { return r.id !== id; }); eqRerender();
};
ACT['eqe-clear'] = function () { var e = eqEntry(); e.rows = [eqNewRow(), eqNewRow(), eqNewRow()]; e.remarks = ''; e.reqId = uid(); renderMain(); };
ACT['eq-submit'] = function (el) {
  var type = el.getAttribute('data-type'), e = eqEntry(), items = [], need = {};
  for (var i = 0; i < e.rows.length; i++) {
    var r = e.rows[i];
    if (!r.text.trim() && !String(r.q).trim() && !r.why.trim()) continue;
    if (!r.eid) return toast(L('Row ', 'সারি ') + (i + 1) + L(': select equipment from the list.', ': তালিকা থেকে ইকুইপমেন্ট নির্বাচন করুন।'), 'error');
    var q = Number(r.q);
    if (!(q > 0)) return toast(L('Row ', 'সারি ') + (i + 1) + L(': quantity must be greater than 0.', ': পরিমাণ ০-এর বেশি দিন।'), 'error');
    if (type === 'DAMAGE' && r.why.trim().length < 3) return toast(L('Row ', 'সারি ') + (i + 1) + L(': write the reason for the damage.', ': ড্যামেজের কারণ লিখুন।'), 'error');
    need[r.eid] = (need[r.eid] || 0) + q;
    items.push({ equipId: r.eid, qty: q, reason: r.why.trim() });
  }
  if (!items.length) return toast(L('Add at least 1 equipment with quantity.', 'কমপক্ষে ১টি ইকুইপমেন্ট ও পরিমাণ দিন।'), 'error');
  for (var id in need) {
    var q2 = eqById(id); if (!q2) continue;
    if ((type === 'OUT' || type === 'DAMAGE') && need[id] > q2.net + 1e-9) return toast(q2.code + ' - ' + q2.name + L(': only ', ': মাত্র ') + fmtN(q2.net) + L(' good (net) available.', 'টি ভালো (নেট) আছে।'), 'error');
    if (type === 'REPAIRED' && need[id] > q2.dmg + 1e-9) return toast(q2.code + ' - ' + q2.name + L(': only ', ': মাত্র ') + fmtN(q2.dmg) + L(' damaged.', 'টি ড্যামেজ আছে।'), 'error');
  }
  if (e.date > today()) return toast(L('Future date is not allowed.', 'ভবিষ্যতের তারিখ দেওয়া যাবে না।'), 'error');
  api('equipSaveTxns', { type: type, date: e.date, remarks: e.remarks, items: items, requestId: e.reqId }).then(function (r) {
    eqSet(r.stock); S.eq.entry = null; eqEntry().date = e.date; renderMain(); eqShowBatch(r.batch, true);
  }).catch(failToast);
};
ACT['eq-last'] = function () { var d = S.eq.data; if (d && d.lastBatch && d.lastBatch.length) eqShowBatch(d.lastBatch, false); };
function eqShowBatch(batch, fresh) {
  var b = batch[0], tp = EQ_TYPE_UI[b.type] || [b.type, b.type];
  var body = `<div class="space-y-3">${fresh ? `<div class="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900">${ic('circle-check', 'w-8 h-8 text-emerald-600')}<div><div class="text-base font-black text-emerald-700 dark:text-emerald-300">${L(tp[0], tp[1])} ${L('saved', 'সেভ হয়েছে')}</div><div class="text-xs text-slate-500">${L('Saved to database and history.', 'ডাটাবেজ ও হিস্টোরিতে সেভ হয়েছে।')}</div></div></div>` : ''}
    <div class="flex flex-wrap gap-1.5 text-xs">${badgeType(b.type)}<span>${fmtD(b.date)} ${esc(String(b.time).slice(0, 5))}</span><span>• ${esc(b.user)}</span></div>
    ${table(`<th class="${TH}">SL</th><th class="${TH}">${L('SCS ID', 'SCS আইডি')}</th><th class="${TH} text-left">${L('Equipment', 'ইকুইপমেন্ট')}</th><th class="${TH}">${L('Qty', 'পরিমাণ')}</th><th class="${TH} text-left">${L('Reason / Remarks', 'কারণ / মন্তব্য')}</th>`,
      batch.map(function (x, i) { return `<tr class="${TR}"><td class="${TD} text-center font-mono text-slate-500">${i + 1}</td><td class="${TD} text-center font-mono font-bold">${esc(x.code)}</td><td class="${TD} font-semibold">${esc(x.name)} <span class="text-slate-400">${esc(x.brand)} ${esc(x.model)}</span></td><td class="${TD} text-center font-mono font-black">${fmtN(x.qty)}</td><td class="${TD} text-[11px]">${esc(x.remarks || '')}</td></tr>`; }).join(''))}</div>`;
  openModal({ id: 'eqbatch', title: L(tp[0], tp[1]) + ' — ' + L('Equipment', 'ইকুইপমেন্ট'), sub: batch.length + ' ' + L('item(s)', 'টি আইটেম'), icon: 'wrench', body: body, size: 'max-w-2xl',
    foot: btn('OK', 'modal-close', 'primary', '', 'data-id="eqbatch"') });
}

/* ---------- 3. EQUIPMENT HISTORY ---------- */
function eqHist() {
  if (!S.eq.hist) S.eq.hist = { f: { q: '', equipId: '', type: '', user: '', status: 'ACTIVE', dmode: 'date', date: today() }, page: 1, size: 50, data: null, users: [], seq: 0 };
  return S.eq.hist;
}
function eqHistParams(all) {
  var h = eqHist(), f = h.f, p = dateFilterParams(f);
  ['q', 'equipId', 'type', 'user'].forEach(function (k) { if (f[k]) p[k] = f[k]; });
  p.status = isAdmin() ? f.status : 'ACTIVE'; p.page = all ? 1 : h.page; p.size = all ? 0 : h.size;
  return p;
}
function eqHistLoad() {
  var h = eqHist(), my = ++h.seq;
  return swr('equipQuery', eqHistParams(), function (d) { if (h.seq !== my) return; h.data = d; h.users = d.users; eqHistPaint(); }).catch(failToast);
}
function eqHistPaint() { if (S.view !== 'history' || S.kind !== 'EQP') return; var t = document.getElementById('eqh-res'); if (t) t.innerHTML = eqHistResultHTML(); else softRender(); }
bindPeriod('eqh', function () { return eqHist().f; }, function () { var h = eqHist(); h.page = 1; h.data = null; renderMain(); eqHistLoad(); });
function eqHistHTML() {
  var h = eqHist(), f = h.f, users = h.users || [], pp = f.equipId ? eqById(f.equipId) : null;
  var tools = periodBar('eqh', f, PERIOD_TXN) +
    `<select data-ch="eqh-f" data-k="equipId" class="${SELC} max-w-64">${opt('', L('All equipment', 'সব ইকুইপমেন্ট'), f.equipId)}${eqRows().map(function (r) { return opt(r.id, eqLabel(r), f.equipId); }).join('')}</select>` +
    searchBox('data-in="eqh-q"', f.q, L('Search ID / name / reason / user', 'আইডি / নাম / কারণ খুঁজুন')) +
    `<select data-ch="eqh-f" data-k="type" class="${SELC}">${opt('', L('All types', 'সব টাইপ'), f.type)}${opt('IN', 'Stock IN', f.type)}${opt('OUT', 'Stock OUT', f.type)}${opt('DAMAGE', L('Damage', 'ড্যামেজ'), f.type)}${opt('REPAIRED', L('Repaired', 'ঠিক হয়েছে'), f.type)}</select>
    <select data-ch="eqh-f" data-k="user" class="${SELC}">${opt('', L('All users', 'সব ইউজার'), f.user)}${users.map(function (u) { return opt(u, u, f.user); }).join('')}</select>
    ${isAdmin() ? `<select data-ch="eqh-f" data-k="status" class="${SELC}">${opt('ACTIVE', L('Active', 'সক্রিয়'), f.status)}${opt('DELETED', L('Deleted', 'ডিলিটেড'), f.status)}${opt('ALL', L('All status', 'সব স্ট্যাটাস'), f.status)}</select>` : ''}
    <button type="button" data-act="eqh-reset" title="${L('Reset', 'রিসেট')}" class="p-1.5 rounded-lg text-slate-500 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer">${ic('rotate-ccw', 'w-3.5 h-3.5')}</button>`;
  var title = pp ? 'EQUIPMENT HISTORY — ' + pp.code + ' ' + pp.name : 'EQUIPMENT HISTORY — ' + periodUpper(f);
  return reportShell({ tools: tools, actions: [actPrint(), actCsv('eqh-csv')], printTitle: title, subTitle: pp ? periodText(f) : '', body: `<div id="eqh-res">${eqHistResultHTML()}</div>` });
}
function eqActCell(x) {
  return `<td class="${TD} no-print whitespace-nowrap text-center"><div class="inline-flex gap-1">${x.status !== 'DELETED' ? `
    <button type="button" data-act="eqx-edit" data-id="${esc(x.id)}" title="${L('Edit (PIN)', 'এডিট (পিন লাগবে)')}" class="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer">${ic('pen-line', 'w-3.5 h-3.5')}</button>
    <button type="button" data-act="eqx-del" data-id="${esc(x.id)}" title="${L('Delete (PIN)', 'ডিলিট (পিন লাগবে)')}" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer">${ic('trash-2', 'w-3.5 h-3.5')}</button>` : ''}</div></td>`;
}
function eqHistResultHTML() {
  var h = eqHist(), d = h.data;
  if (!d) return loadingBlock();
  var col = { IN: 'text-emerald-700 dark:text-emerald-400', OUT: 'text-rose-600', DAMAGE: 'text-amber-600', REPAIRED: 'text-sky-600' };
  var rows = d.rows.map(function (x) {
    var del = x.status === 'DELETED';
    return `<tr class="${TR}${del ? ' bg-rose-50/70 dark:bg-rose-950/20' : ''}">
      <td class="${TD} text-center whitespace-nowrap">${fmtD(x.date)}<div class="text-[10px] text-slate-400 font-mono">${esc(String(x.time).slice(0, 5))}</div></td>
      <td class="${TD} text-center">${badgeType(x.type)}</td>
      <td class="${TD}"><span class="font-mono font-bold text-pink-600 dark:text-pink-400">${esc(x.code)}</span> <span class="font-semibold">${esc(x.name)}</span> <span class="text-slate-400">${esc(x.brand)} ${esc(x.model)}</span><div class="text-[10px] text-slate-400 font-mono">${esc(x.id)}</div></td>
      <td class="${TD} text-center font-mono font-black ${col[x.type] || ''}">${fmtN(x.qty)}</td>
      <td class="${TD} text-center whitespace-nowrap">${esc(x.user)}</td>
      <td class="${TD} text-[11px] max-w-64">${esc(x.remarks || '')}${x.edits ? `<div><span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">${L('Edited', 'এডিটেড')} ×${x.edits}</span></div>` : ''}
        ${del ? `<div class="text-[10px] text-rose-700 dark:text-rose-300 font-semibold">${L('Deleted by', 'ডিলিট করেছেন')} ${esc(x.deletedBy)} • ${fmtDT(x.deletedAt)} • ${esc(x.delReason)}</div>` : ''}</td>${eqActCell(x)}</tr>`;
  }).join('');
  return `<div class="flex flex-wrap items-center justify-between gap-1.5 mb-1.5"><div class="flex flex-wrap gap-1">${chip(fmtN(d.total) + ' ' + L('lines', 'লাইন'), 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700')}
      ${chip('IN: ' + fmtN(d.sum.IN), 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800')}${chip('OUT: ' + fmtN(d.sum.OUT), 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800')}
      ${chip(L('Damage: ', 'ড্যামেজ: ') + fmtN(d.sum.DAMAGE), 'bg-amber-50 text-amber-800 border-amber-200')}${chip(L('Repaired: ', 'ঠিক হয়েছে: ') + fmtN(d.sum.REPAIRED), 'bg-sky-50 text-sky-800 border-sky-200')}</div>
      <div class="no-print flex items-center gap-1.5">${sizeSel('eqh', h.size)}${pager('eqh', d)}</div></div>` +
    table(`<th class="${TH}">${L('Date', 'তারিখ')}</th><th class="${TH}">${L('Type', 'টাইপ')}</th><th class="${TH} text-left">${L('Equipment / ID', 'ইকুইপমেন্ট / আইডি')}</th><th class="${TH}">${L('Qty', 'পরিমাণ')}</th><th class="${TH}">${L('User', 'ইউজার')}</th><th class="${TH} text-left">${L('Reason / Remarks', 'কারণ / মন্তব্য')}</th><th class="${TH} no-print w-20"></th>`,
      rows || emptyRow(7, L('No entries for this filter.', 'এই ফিল্টারে কোনো এন্ট্রি নেই।'))) +
    (d.pages > 1 ? `<div class="no-print mt-1.5 flex justify-end">${pager('eqh', d)}</div>` : '');
}
var eqhTimer = null;
IN['eqh-q'] = function (el) { var h = eqHist(); h.f.q = el.value; h.page = 1; clearTimeout(eqhTimer); eqhTimer = setTimeout(eqHistLoad, 350); };
CH['eqh-f'] = function (el) { var h = eqHist(); h.f[el.getAttribute('data-k')] = el.value; h.page = 1; h.data = null; renderMain(); eqHistLoad(); };
CH['eqh-size'] = function (el) { var h = eqHist(); h.size = Number(el.value); h.page = 1; eqHistLoad(); };
ACT['eqh-page'] = function (el) { var h = eqHist(); h.page = Number(el.getAttribute('data-p')); eqHistLoad(); };
ACT['eqh-reset'] = function () { S.eq.hist = null; renderMain(); eqHistLoad(); };
ACT['eqh-csv'] = function () {
  api('equipQuery', eqHistParams(true)).then(function (d) {
    downloadCsv('SCS_Equipment_History_' + today(), ['Entry ID', 'Date', 'Time', 'Type', 'SCS ID', 'Equipment', 'Brand', 'Model', 'Quantity', 'User', 'Reason / Remarks', 'Status'],
      d.rows.map(function (x) { return [x.id, x.date, x.time, x.type, x.code, x.name, x.brand, x.model, x.qty, x.user, x.remarks, x.status]; }));
  }).catch(failToast);
};
function eqHistRow(id) { var d = eqHist().data; return d ? d.rows.filter(function (x) { return x.id === id; })[0] : null; }
ACT['eqx-edit'] = function (el) {
  var x = eqHistRow(el.getAttribute('data-id')); if (!x) return;
  var body = `<div class="space-y-3"><div class="text-xs p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">${badgeType(x.type)} <b class="ml-1">${esc(x.code)} - ${esc(x.name)}</b></div>
    <div class="grid grid-cols-2 gap-3">${field(L('Quantity', 'পরিমাণ'), `<input type="number" step="any" min="0" id="ex-qty" value="${x.qty}" class="${INP} font-mono font-bold" autofocus>`)}
    ${field(L('Date', 'তারিখ'), `<input type="date" id="ex-date" max="${today()}" value="${esc(x.date)}" class="${INP}">`)}</div>
    ${field(x.type === 'DAMAGE' ? L('Damage reason', 'ড্যামেজের কারণ') : L('Remarks', 'মন্তব্য'), `<input type="text" id="ex-remarks" maxlength="300" value="${esc(x.remarks)}" class="${INP}">`)}
    ${field(L('Reason for edit (required)', 'এডিটের কারণ (আবশ্যক)'), `<textarea id="ex-reason" rows="2" class="${INP}"></textarea>`)}</div>`;
  openModal({ id: 'exedit', title: L('Edit Equipment Entry', 'ইকুইপমেন্ট এন্ট্রি এডিট'), icon: 'pen-line', body: body, size: 'max-w-md',
    foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="exedit"') + btn(L('Save Changes', 'পরিবর্তন সেভ'), 'eqx-edit-save', 'primary', 'save', 'data-id="' + esc(x.id) + '"') });
};
ACT['eqx-edit-save'] = function (el) {
  var reason = val('ex-reason').trim(); if (!reason) return toast(L('Please write the reason.', 'কারণ লিখুন।'), 'error');
  var d = { id: el.getAttribute('data-id'), qty: Number(val('ex-qty')), date: val('ex-date'), remarks: val('ex-remarks').trim(), reason: reason };
  if (!(d.qty > 0)) return toast(L('Quantity must be greater than 0.', 'পরিমাণ ০-এর বেশি দিন।'), 'error');
  withPin(function (pin) { d.authPin = pin; return api('equipTxnUpdate', d, { silent: true }); }, function (r) {
    eqSet(r.stock); closeModal('exedit'); toast(L('Entry updated.', 'এন্ট্রি আপডেট হয়েছে।'), 'success'); eqHistLoad();
  });
};
ACT['eqx-del'] = function (el) {
  var x = eqHistRow(el.getAttribute('data-id')); if (!x) return;
  confirmBox({ title: L('Delete Equipment Entry', 'ইকুইপমেন্ট এন্ট্রি ডিলিট'), danger: true, reason: true, okText: L('Delete', 'ডিলিট'),
    message: `<b>${esc(x.type)} ${esc(x.code)} - ${esc(x.name)} × ${fmtN(x.qty)}</b> (${fmtD(x.date)})<br>${L('Stock will be recalculated. The record is kept in Admin → Deleted Records and can be restored there.', 'স্টক আবার হিসাব হবে। রেকর্ডটি Admin → Deleted Records-এ থাকবে, সেখান থেকে ফেরানো যাবে।')}`,
    onOk: function (reason) {
      withPin(function (pin) { return api('equipTxnDelete', { ids: [x.id], reason: reason, authPin: pin }, { silent: true }); }, function (r) {
        eqSet(r.stock); toast(L('Entry deleted.', 'এন্ট্রি ডিলিট হয়েছে।'), 'success'); eqHistLoad();
      });
    } });
};

/* ---------- 4. ADMIN → EQUIPMENT (add / edit / status / delete) ---------- */
function eqmState() { if (!A.eqm) A.eqm = { q: '', status: '' }; return A.eqm; }
function adminEquip() {
  var s = eqmState(), q = s.q.trim().toLowerCase();
  if (!S.eq.data) return loadingBlock();
  var rows = eqRows().filter(function (r) { return (!s.status || r.status === s.status) && (!q || (r.code + ' ' + r.name + ' ' + r.brand + ' ' + r.model).toLowerCase().indexOf(q) >= 0); });
  var body = rows.map(function (r) {
    return `<tr class="${TR}">
      <td class="${TD} text-center font-mono text-slate-500">${r.order}</td><td class="${TD} text-center whitespace-nowrap">${fmtD(r.date)}</td>
      <td class="${TD} font-semibold">${esc(r.name)}</td><td class="${TD} text-center">${esc(r.brand || '-')}</td><td class="${TD} text-center">${esc(r.model || '-')}</td>
      <td class="${TD} text-center font-mono font-bold">${esc(r.code)}</td>
      <td class="${TD} text-center font-mono eq-qty font-bold">${fmtN(r.qty)}</td><td class="${TD} text-center font-mono font-bold text-rose-600">${r.dmg ? fmtN(r.dmg) : '-'}</td><td class="${TD} text-center font-mono font-black stk-cur">${fmtN(r.net)}</td>
      <td class="${TD} text-center"><button type="button" data-act="eqm-status" data-id="${esc(r.id)}" class="px-2 py-0.5 rounded-full text-[10px] font-black border cursor-pointer ${r.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-200 text-slate-700 border-slate-300'}">${r.status === 'ACTIVE' ? L('Active', 'সক্রিয়') : L('Inactive', 'নিষ্ক্রিয়')}</button></td>
      <td class="${TD} text-center whitespace-nowrap"><div class="inline-flex gap-0.5">
        <button type="button" data-act="eqm-edit" data-id="${esc(r.id)}" class="p-1 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer" title="${L('Edit', 'এডিট')}">${ic('pen-line', 'w-3.5 h-3.5')}</button>
        <button type="button" data-act="eqm-del" data-id="${esc(r.id)}" class="p-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer" title="${L('Delete', 'ডিলিট')}">${ic('trash-2', 'w-3.5 h-3.5')}</button></div></td></tr>`;
  }).join('');
  return card('', '', `<div class="flex flex-wrap items-center gap-1.5 mb-2">
      ${searchBox('data-in="eqm-q"', s.q, L('Search ID / name / brand / model', 'আইডি / নাম / ব্র্যান্ড / মডেল খুঁজুন'))}
      <select data-ch="eqm-sf" class="${SELC}">${opt('', L('All status', 'সব স্ট্যাটাস'), s.status)}${opt('ACTIVE', L('Active', 'সক্রিয়'), s.status)}${opt('INACTIVE', L('Inactive', 'নিষ্ক্রিয়'), s.status)}</select>
      ${btn(L('Import from Google Sheet', 'গুগল শিট থেকে ইম্পোর্ট'), 'eqi-open', 'ghost', 'file-spreadsheet')}${btn(L('Add Equipment', 'ইকুইপমেন্ট যোগ'), 'eqm-add', 'primary', 'plus')}</div>
    <div id="eqm-table">${table(`<th class="${TH} w-14">${L('Serial', 'সিরিয়াল')}</th><th class="${TH}">${L('Date', 'তারিখ')}</th><th class="${TH} text-left">${L('Product Name', 'প্রোডাক্ট নাম')}</th><th class="${TH}">${L('Brand', 'ব্র্যান্ড')}</th><th class="${TH}">${L('Model', 'মডেল')}</th><th class="${TH}">${L('SCS ID Number', 'SCS আইডি নম্বর')}</th><th class="${TH}">${L('Quantity', 'পরিমাণ')}</th><th class="${TH}">${L('Damaged', 'ড্যামেজ')}</th><th class="${TH}">${L('Net', 'নেট')}</th><th class="${TH}">${L('Status', 'স্ট্যাটাস')}</th><th class="${TH} w-20"></th>`,
      body || emptyRow(11, L('No equipment yet — press "Add Equipment".', 'এখনো কিছু নেই — "ইকুইপমেন্ট যোগ" চাপুন।')))}</div>`);
}
IN['eqm-q'] = function (el) { eqmState().q = el.value; var c = document.getElementById('adm-content'), pos = el.selectionStart; c.innerHTML = adminEquip(); var n = c.querySelector('[data-in="eqm-q"]'); n.focus(); n.setSelectionRange(pos, pos); };
CH['eqm-sf'] = function (el) { eqmState().status = el.value; renderMain(); };
function equipForm(e) {
  e = e || {};
  return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
    ${field(L('Product Name *', 'প্রোডাক্ট নাম *'), `<input type="text" id="ef-name" maxlength="150" value="${esc(e.name || '')}" class="${INP}" autofocus>`, 'sm:col-span-2')}
    ${field(L('Brand Name', 'ব্র্যান্ড নাম'), `<input type="text" id="ef-brand" maxlength="100" value="${esc(e.brand || '')}" class="${INP}">`)}
    ${field(L('Model Number', 'মডেল নম্বর'), `<input type="text" id="ef-model" maxlength="100" value="${esc(e.model || '')}" class="${INP}">`)}
    ${field(L('SCS ID Number * (must be different for each)', 'SCS আইডি নম্বর * (প্রতিটির আলাদা হতে হবে)'), `<input type="text" id="ef-code" maxlength="60" value="${esc(e.code || '')}" class="${INP} font-mono">`)}
    ${field(L('Date', 'তারিখ'), `<input type="date" id="ef-date" max="${today()}" value="${esc(e.date || today())}" class="${INP}">`)}
    ${e.id ? '' : field(L('Opening Quantity', 'শুরুর পরিমাণ'), `<input type="number" id="ef-qty" min="0" step="any" value="" placeholder="0" class="${INP} font-mono">`)}
    ${field(L('Unit', 'ইউনিট'), `<input type="text" id="ef-unit" maxlength="30" value="${esc(e.unit || 'Pcs')}" class="${INP}">`)}
    ${field(L('Serial / Display Order', 'সিরিয়াল / ক্রম'), `<input type="number" id="ef-order" min="1" value="${e.order || ''}" placeholder="${L('last', 'শেষে')}" class="${INP} font-mono">`)}
    ${field(L('Status', 'স্ট্যাটাস'), `<select id="ef-status" class="${INP}">${opt('ACTIVE', L('Active', 'সক্রিয়'), e.status || 'ACTIVE')}${opt('INACTIVE', L('Inactive', 'নিষ্ক্রিয়'), e.status || 'ACTIVE')}</select>`)}
  </div>${e.id ? `<p class="mt-2 text-[11px] text-slate-500">${L('Quantity is changed from Stock IN / OUT (Equipment), not here.', 'পরিমাণ বদলাতে হবে Stock IN / OUT (Equipment) থেকে, এখানে নয়।')}</p>` : ''}`;
}
ACT['eqm-add'] = function () {
  openModal({ id: 'eform', title: L('Add Equipment', 'ইকুইপমেন্ট যোগ'), icon: 'wrench', size: 'max-w-xl', body: equipForm(null),
    foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="eform"') + btn(L('Save Equipment', 'ইকুইপমেন্ট সেভ'), 'eqm-save', 'primary', 'save') });
};
ACT['eqm-edit'] = function (el) {
  var e = eqById(el.getAttribute('data-id')); if (!e) return;
  openModal({ id: 'eform', title: L('Edit Equipment', 'ইকুইপমেন্ট এডিট'), sub: '<span class="font-mono">' + esc(e.id) + '</span>', icon: 'pen-line', size: 'max-w-xl', body: equipForm(e),
    foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="eform"') + btn(L('Save Changes', 'পরিবর্তন সেভ'), 'eqm-save', 'primary', 'save', 'data-id="' + esc(e.id) + '"') });
};
ACT['eqm-save'] = function (el) {
  var d = { id: el.getAttribute('data-id') || '', name: val('ef-name').trim(), brand: val('ef-brand').trim(), model: val('ef-model').trim(), code: val('ef-code').trim(), date: val('ef-date'),
    qty: Number(val('ef-qty')) || 0, unit: val('ef-unit').trim(), order: Number(val('ef-order')), status: val('ef-status') };
  if (!d.name) return toast(L('Product Name is required.', 'প্রোডাক্ট নাম দিতে হবে।'), 'error');
  if (!d.code) return toast(L('SCS ID Number is required.', 'SCS আইডি নম্বর দিতে হবে।'), 'error');
  if (eqRows().some(function (r) { return r.id !== d.id && r.code.toLowerCase() === d.code.toLowerCase(); })) return toast(L('This SCS ID is already used.', 'এই SCS আইডি আগে থেকেই ব্যবহৃত।'), 'error');
  (d.id ? pinApi : function (a, x, done) { api(a, x).then(function (r) { CACHE = {}; done(r); }).catch(failToast); })('equipSave', d, function (r) {
    eqSet(r); closeModal('eform'); renderMain(); toast(d.id ? L('Equipment updated.', 'ইকুইপমেন্ট আপডেট হয়েছে।') : L('Equipment added: ', 'ইকুইপমেন্ট যোগ হয়েছে: ') + d.code, 'success');
  });
};
ACT['eqm-status'] = function (el) {
  var e = eqById(el.getAttribute('data-id')); if (!e) return;
  pinApi('equipStatus', { id: e.id, status: e.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }, function (r) { eqSet(r); renderMain(); });
};
ACT['eqm-del'] = function (el) {
  var e = eqById(el.getAttribute('data-id')); if (!e) return;
  var hist = e.count > 0;
  var body = `<div class="space-y-3 text-xs"><div class="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"><b class="font-mono">${esc(e.code)}</b> — <b>${esc(e.name)}</b> ${esc(e.brand)} ${esc(e.model)}</div>
    ${hist ? `<div class="flex gap-2 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200">${ic('info', 'w-4 h-4 shrink-0')}<span>${L('This equipment has history, so it goes to Deleted Records (history stays safe) and can be restored.', 'এই ইকুইপমেন্টের হিস্টোরি আছে, তাই এটি Deleted Records-এ যাবে (হিস্টোরি নিরাপদ থাকবে) এবং ফেরানো যাবে।')}</span></div>`
      : `<label class="flex items-start gap-2 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 cursor-pointer"><input type="checkbox" id="ed-perm" class="w-4 h-4 mt-0.5 accent-rose-600"><span>${L('No history — delete permanently (cannot be undone).', 'কোনো হিস্টোরি নেই — স্থায়ীভাবে মুছুন (ফেরানো যাবে না)।')}</span></label>`}
    ${field(L('Reason (required)', 'কারণ (আবশ্যক)'), `<textarea id="ed-reason" rows="2" autofocus class="${INP}"></textarea>`)}</div>`;
  openModal({ id: 'edel', title: L('Delete Equipment', 'ইকুইপমেন্ট ডিলিট'), icon: 'trash-2', size: 'max-w-md', body: body,
    foot: btn(L('Cancel', 'বাতিল'), 'modal-close', 'ghost', '', 'data-id="edel"') + btn(L('Delete', 'ডিলিট'), 'eqm-del-ok', 'danger', 'trash-2', 'data-id="' + esc(e.id) + '"') });
};
ACT['eqm-del-ok'] = function (el) {
  var reason = val('ed-reason').trim(), perm = !!(document.getElementById('ed-perm') && document.getElementById('ed-perm').checked);
  if (!reason) return toast(L('Please write the reason.', 'কারণ লিখুন।'), 'error');
  pinApi('equipDelete', { id: el.getAttribute('data-id'), reason: reason, permanent: perm }, function (r) {
    eqSet(r); closeModal('edel'); renderMain(); toast(r.permanent ? L('Equipment permanently deleted.', 'ইকুইপমেন্ট স্থায়ীভাবে মুছে ফেলা হয়েছে।') : L('Moved to Deleted Records. History is safe.', 'Deleted Records-এ গেছে। হিস্টোরি নিরাপদ।'), 'success');
  });
};


/* ---------- 5. IMPORT EQUIPMENT FROM GOOGLE SHEET LINK ---------- */
var EQI = { link: LS.get('scs_eq_import_link', ''), tab: LS.get('scs_eq_import_tab', '1'), prev: null, busy: false };
function eqiBody() {
  var p = EQI.prev, rows = '', sum = '';
  if (p) {
    var lab = { IMPORT: ['text-emerald-700 bg-emerald-50', L('Import', 'ইম্পোর্ট')], EXISTS: ['text-slate-600 bg-slate-100', L('Exists', 'আছে')], SKIP: ['text-rose-700 bg-rose-50', L('Skip', 'বাদ')] };
    sum = '<div class="flex flex-wrap gap-1.5 my-2">' + chip(L('Sheet: ', 'শিট: ') + esc(p.title) + ' / ' + esc(p.tab), 'bg-slate-100 text-slate-700 border-slate-200') +
      chip(L('To import: ', 'ইম্পোর্ট হবে: ') + p.sum.import, 'bg-emerald-50 text-emerald-700 border-emerald-200') + chip(L('Qty ', 'পরিমাণ ') + fmtN(p.sum.qty) + ' • ' + L('Net ', 'নেট ') + fmtN(p.sum.net), 'bg-cyan-50 text-sky-700 border-cyan-200') +
      (p.sum.damaged ? chip(L('With damage: ', 'ড্যামেজসহ: ') + p.sum.damaged, 'bg-amber-50 text-amber-800 border-amber-200') : '') +
      (p.sum.exists ? chip(L('Already exist: ', 'আগে থেকেই আছে: ') + p.sum.exists, 'bg-slate-100 text-slate-700 border-slate-200') : '') +
      (p.sum.skip ? chip(L('Skipped: ', 'বাদ: ') + p.sum.skip, 'bg-rose-50 text-rose-700 border-rose-200') : '') + '</div>';
    rows = p.items.map(function (x) {
      var l = lab[x.action];
      return `<tr class="${TR}"><td class="${TD} text-center font-mono text-slate-500">${x.line}</td><td class="${TD} text-center"><span class="px-1.5 py-0.5 rounded font-bold text-[10px] ${l[0]}">${l[1]}</span></td><td class="${TD} font-semibold">${esc(x.name)} <span class="text-slate-400">${esc(x.brand)} ${esc(x.model)}</span></td><td class="${TD} text-center font-mono font-bold">${esc(x.code)}</td><td class="${TD} text-center font-mono">${fmtN(x.qty)}</td><td class="${TD} text-center font-mono font-black">${fmtN(x.net)}</td><td class="${TD} text-center font-mono text-rose-600">${x.dmg ? fmtN(x.dmg) : ''}</td><td class="${TD} text-[10px] text-slate-500">${esc(x.reason && x.dmg ? x.reason + (x.notes.length ? ' • ' : '') : '')}${esc(x.notes.join(' • '))}</td></tr>`;
    }).join('');
  }
  return `<div class="space-y-2"><div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
    ${field(L('Google Sheet link', 'গুগল শিটের লিংক'), `<input type="text" id="eqi-link" value="${esc(EQI.link)}" placeholder="https://docs.google.com/spreadsheets/d/..." class="${INP}" autofocus>`, 'sm:col-span-3')}
    ${field(L('Tab name', 'ট্যাবের নাম'), `<input type="text" id="eqi-tab" value="${esc(EQI.tab)}" class="${INP}">`)}</div>
    <p class="text-[11px] text-slate-500">${L('Columns: SL, DATE, PRODUCT NAME, BRAND NAME, MODEL NUMBER, SCS ID NUMBER, QUTY, Status, Net Quantity, Status Explain. Quantity − Net becomes a Damage entry with the Status Explain as reason. The sheet must be shared with the account that runs this app.', 'কলাম: SL, DATE, PRODUCT NAME, BRAND NAME, MODEL NUMBER, SCS ID NUMBER, QUTY, Status, Net Quantity, Status Explain। QUTY − Net = ড্যামেজ এন্ট্রি হবে, কারণ হবে Status Explain। শিটটি এই অ্যাপ যে অ্যাকাউন্টে চলে তাকে শেয়ার করা থাকতে হবে।')}</p>
    ${sum}${p ? table(`<th class="${TH}">${L('Row', 'সারি')}</th><th class="${TH}">${L('Action', 'কাজ')}</th><th class="${TH} text-left">${L('Equipment', 'ইকুইপমেন্ট')}</th><th class="${TH}">${L('SCS ID', 'SCS আইডি')}</th><th class="${TH}">${L('Qty', 'পরিমাণ')}</th><th class="${TH}">${L('Net', 'নেট')}</th><th class="${TH}">${L('Damage', 'ড্যামেজ')}</th><th class="${TH} text-left">${L('Note', 'নোট')}</th>`, rows) : ''}</div>`;
}
function eqiModal() {
  var p = EQI.prev;
  openModal({ id: 'eqi', title: L('Import Equipment from Google Sheet', 'গুগল শিট থেকে ইকুইপমেন্ট ইম্পোর্ট'), icon: 'file-spreadsheet', size: 'max-w-4xl', body: eqiBody(),
    foot: btn(L('Close', 'বন্ধ'), 'modal-close', 'ghost', '', 'data-id="eqi"') + btn(L('Preview', 'প্রিভিউ'), 'eqi-preview', 'ghost', 'eye') +
      (p && p.sum.import ? btn(L('Import', 'ইম্পোর্ট') + ' (' + p.sum.import + ')', 'eqi-run', 'primary', 'save') : '') });
}
function eqiRead() { EQI.link = val('eqi-link').trim(); EQI.tab = val('eqi-tab').trim() || '1'; LS.set('scs_eq_import_link', EQI.link); LS.set('scs_eq_import_tab', EQI.tab); }
ACT['eqi-open'] = function () { EQI.prev = null; eqiModal(); };
ACT['eqi-preview'] = function () {
  eqiRead(); if (!EQI.link) return toast(L('Paste the sheet link.', 'শিটের লিংক দিন।'), 'error');
  api('equipSheetPreview', { link: EQI.link, tab: EQI.tab }).then(function (d) { EQI.prev = d; eqiModal(); }).catch(failToast);
};
ACT['eqi-run'] = function () {
  eqiRead();
  pinApi('equipSheetImport', { link: EQI.link, tab: EQI.tab }, function (r) {
    eqSet(r.stock); EQI.prev = null; closeModal('eqi'); renderMain();
    toast(r.imported + L(' equipment imported', 'টি ইকুইপমেন্ট ইম্পোর্ট হয়েছে') + (r.damaged ? ' (' + r.damaged + L(' with damage', 'টিতে ড্যামেজ') + ')' : ''), 'success');
  });
};

start();

})();