# Maestro Template Builder

The Maestro module's template builder JS project.
* [Maestro](https://drupal.org/project/maestro) - Maestro workflow engine

## Development

Prepare the project by installing all dependencies:

```sh
npm install
```
### Build the library
```sh
npx vite build
```
### Development
The output from building the project will be placed in the **/dist** directory.  Within the dist directory, **js** and **css** directories will be created.  The contents of the dist/js and dist/css directories you ***add*** to the existing contents of the Maestro module's **js** and **css** directories respectively.  You will ***overwrite*** the MaestroTemplateBuilder.js and diagram.css files in the Maestro module's js and css directories.  

***You must retain any other existing CSS and Javascript files in the Maestro module's js and css directories.***



You can edit the vite.config.js file and turn on/off various settings.  

* Turn off minification by changing the minify property
```
minify: true, // Minified output on.  Set to false for debug
```

* Sourcemap file generation

Set to true by default, but is really only useful when you've turned minification off.
```
sourcemap: true, // Generates our output JS mapping for debug
```

## License

MIT

