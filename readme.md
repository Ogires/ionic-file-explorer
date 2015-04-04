
#Ionic File Explorer Service
============================

Es un servicio de Angularjs para utlizar exclusivamente en aplicaciones desarrolladas con Ionic Framework. Su desarrollo está motivado porque en algunas versiones de Android, el API File dejó de ser accesible en el WebView mediante el uso de la etiqueta `<input type="file" />`.

## Instalacion

- Para funcionar necesita ionic y el plugin cordova.plugin.file
- Incluye el fichero og-file-explorer.js después de ionic
	`<script src="og-file-explorer.js"></script>`

- Declaralo como dependencia para tu aplicación:
	`var myApp = angular.module('myApp', ['ogUtils']);`

- En tu Controller declara una dependencia del servicio 'ogFileExplorer'
	`myApp.controller("myController",function(ogFileExplorer));`

## Uso

- El explorador se abre usando el método `open(configuracion)` del servicio, el cual devuelve una instancia del explorador. El método acepta un objeto con parametros de configuración.
- La instancia devuelta por por `open` expone una propiedad promise denominada `result`, que de resolverse con éxito contendrá los ficheros seleccionados (los ficheros son objetos de tipo FileEntry, que se detallan en la documentación del Api File de Cordova).
 
##Ejemplo
```
angular.module('prueba.controllers', ["ogUtils"])

.controller('AppCtrl', function($scope, ogFileExplorer) {
  
  $scope.probarServicio = function() {
        var explorador = ogFileExplorer.open({
          scope : $scope
        });
        
        explorador.result.then(function (ficheros) {
            for(var i=0;i<ficheros.length;i++) {
                $scope.videos.push({src: ficheros[i].toURL(), type: "video/mp4"});
            }
            $scope.setVideo(0);           
        }, function (error) {
            console.log("result ERROR " + error);
        });
    }
    ```