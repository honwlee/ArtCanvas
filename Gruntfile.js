module.exports = function(grunt) {
    'use strict';

    // Config
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        jshint: {
            all: ['build/ArtCanvas.js'],
            options: {
                jshintrc: true
            }
        },
        uglify: {
            target: {
                options: {
                    sourceMap: true,
                    sourceMapName: 'build/ArtCanvas.js.map'
                },
                files: {
                    'build/ArtCanvas.min.js': ['build/ArtCanvas.js']
                }
            }
        },
        watch: {
            files: ['build/ArtCanvas.js'],
            tasks: ['uglify']
            /*
            options: {
                livereload: true
            }
            */
        },
        clean: ['build/*.min.js', 'build/*.map']
    });

    // Plugins
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');

    // Tasks
    grunt.registerTask('hint',    ['jshint']);
    grunt.registerTask('build',   ['clean', 'uglify']);
    grunt.registerTask('observe', ['watch']);
};
