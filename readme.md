
#Ionic File Explorer Service
============================

Es un servicio de Angularjs para utlizar exclusivamente en aplicaciones desarrolladas con Ionic Framework. Su desarrollo está motivado porque en algunas versiones de Android, el API File dejó de ser accesible en el WebView mediante el uso de la etiqueta `<input type="file" />`.

## Installation

- Para funcionar necesita ionic y el plugin cordova.plugin.file
- Incluye el fichero og-file-explorer.js después de ionic
	`<script src="og-file-explorer.js"></script>`

- Declaralo como dependencia para tu aplicación:
	`var myApp = angular.module('myApp', ['ogUtils']);`

- En tu Controller declara una dependencia del servicio 'ogFileExplorer'
	`myApp.controller("myController",function(ogFileExplorer));`