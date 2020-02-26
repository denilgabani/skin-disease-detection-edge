
(function ( $, window, document, undefined ) {
    "use strict";
    // undefined is used here as the undefined global
    // variable in ECMAScript 3 and is mutable (i.e. it can
    // be changed by someone else). undefined isn't really
    // being passed in so we can ensure that its value is
    // truly undefined. In ES5, undefined can no longer be
    // modified.

    // window and document are passed through as local
    // variables rather than as globals, because this (slightly)
    // quickens the resolution process and can be more
    // efficiently minified (especially when both are
    // regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = 'dropzone',
        defaults = {
            width:                  300,                            //width of the div
            height:                 300,                            //height of the div
            progressBarWidth:       '100%',                            //width of the progress bars
            url:                    '',                             //url for the ajax to post
            filesName:              'files',                        //name for the form submit
            margin:                 0,                              //margin added if needed
            border:                 '2px dashed #ccc',              //border property
            background:             '',
            zIndex:                 100,                            //Z index of element
            textColor:              '#ccc',                         //text color
            textAlign:              'center',                       //css style for text-align
            text:                   'Drop files here to upload',    //text inside the div
            uploadMode:             'single',                       //upload all files at once or upload single files, options: all or single
            progressContainer:      '',                             //progress selector if null one will be created
            src:                    '',                             //if preview true we can define the image src

            dropzoneWraper:         'nniicc-dropzoneParent',        //wrap the dropzone div with custom class
            files:                  [],                             //Access to the files that are droped
            maxFileSize:            '5MB',                         //max file size ['bytes', 'KB', 'MB', 'GB', 'TB']
            allowedFileTypes:       '*',                            //allowed files to be uploaded seperated by ',' jpg,png,gif
            clickToUpload:          true,                           //click on dropzone to select files old way
            showTimer:              false,                           //show time that has elapsed from the start of the upload,
            removeComplete:         true,                           //delete complete progress bars when adding new files
            preview:                false,                          //if enabled it will load the pictured directly to the html
            uploadOnPreview:        false,                          //Upload file even if the preview is enabled
            uploadOnDrop:           true,                           //Upload file right after drop
            params:                 {},                             //object of additional params

            //functions
            load:                   null,                           //callback when the div is loaded
            progress:               null,                           //callback for the files procent
            uploadDone:             null,                           //callback for the file upload finished
            success:                null,                           //callback for a file uploaded
            error:                  null,                           //callback for any error
            previewDone:            null,                           //callback for the preview is rendered
            mouseOver:              null,                           //callback for mouseover event
            mouseOut:               null,                           //callback for mouseout event
        };

    // The actual plugin constructor
    function Plugin( element, options ) {
        this.element = element;

        // jQuery has an extend method that merges the
        // contents of two or more objects, storing the
        // result in the first object. The first object
        // is generally empty because we don't want to alter
        // the default options for future instances of the plugin
        this.options = $.extend( {}, defaults, options) ;

        this._defaults = defaults;
        this._name = pluginName;

        this.init();
    }

    var xhrDone = {};
    var timers = {};
    var timerStartDate = {};
    var uploadIndex = 0;


    Plugin.prototype.init = function () {
        // Place initialization logic here
        // You already have access to the DOM element and
        // the options via the instance, e.g. this.element
        // and this.options

        $(this.element).css({
            width: this.options.width,
            height: this.options.height,
            border: this.options.border,
            background: this.options.background,
            color: this.options.textColor,
            'text-align': this.options.textAlign,
            'box-align': 'center',
            'box-pack': 'center',
            'z-index': this.options.zIndex
        });

        $(this.element).hover(function() {
            $(this).css("cursor", "pointer");
        }, function() {
            $(this).css("cursor", "default");
        });

        $(this.element).html(this.options.text);

        $(this.element).wrap('<div class="'+this.options.dropzoneWraper+'"></div>');
        $("." + this.options.dropzoneWraper).css('margin', this.options.margin);
        if(this.options.progressContainer === ''){
            this.options.progressContainer = "."+this.options.dropzoneWraper;
        }

        if(this.options.src) $(this.element).attr('src', this.options.src);

        if(typeof $(this.element).attr('src') !== 'undefined'){
            var src = $(this.element).attr('src');
            $(this.element).attr('src', '');
            var clone = $(this.element).clone();
            $(this.element).css({
                'z-index': this.options.zIndex,
                position: 'absolute'
            }).html('').parent().css('position', 'relative');
            clone.appendTo($(this.element).parent());
            clone.replaceWith('<img class="previewImg" src="'+src+'" />');

            $(this.element).parent().find(".previewImg").css({
                width: this.options.width,
                height: this.options.height,
                border: this.options.border,
                background: this.options.background,
                color: this.options.textColor,
                'text-align': this.options.textAlign,
                'box-align': 'center',
                'box-pack': 'center'
            });
        }

        if(this.options.clickToUpload){
            $(this.element).parent().append('<form></form>');
            var onlyOne = this.options.preview;
            var multile = "";
            if(!onlyOne) multile = "multiple";
            $(this.element).parent().find('form')
            .append('<input type="file" name="'+this.options.filesName+'" ' + multile + '/>').hide().
            bind('change', function(event) {
                $(this).trigger('submit');
            }).on('submit', function(event){
                event.preventDefault();
                upload(this, event.target[0].files);
                var input = $(this.element).parent().find('input');

                //input.wrap('<form>').closest('form').get(0).reset();
                input.unwrap().hide();
            }.bind(this));
        }

        $(this.element).bind({
            dragover: function(e){
                e.preventDefault();
                e.stopPropagation();
                $(this.element).css({
                    color: '#000',
                    'border-color': '#000'
                });
            }.bind(this),
            dragleave: function(e){
                e.preventDefault();
                e.stopPropagation();
                dragLeave(this);
            }.bind(this),
            drop: function(e){
                e.preventDefault();
                dragLeave(this);
                if(!this.options.preview){
                    upload(this, e.originalEvent.dataTransfer.files);
                }else{
                    upload(this, e.originalEvent.dataTransfer.files);
                }
            }.bind(this),
            click: function(e){
                if(this.options.clickToUpload){
                    var el;
                    var form;
                    el = $(this.element).parent().find('input');

                    if(el.parent().prop('tagName') !== 'FORM'){

                        form = $("<form></form>");

                        form.bind('change', function(){
                            $(this).trigger('submit');
                        }).on('submit', function(event){
                            event.preventDefault();

                            upload(this, event.target[0].files);
                            var input = $(this.element).parent().find('input');

                            input.unwrap().hide();
                        }.bind(this));
                        el.wrap(form);
                    }
                    el.trigger('click');
                }
            }.bind(this),
            mouseover: function(e){
                if(typeof this.options.mouseOver == "function") this.options.mouseOver(this);
            }.bind(this),
            mouseout: function(e){
                if(typeof this.options.mouseOut == "function") this.options.mouseOut(this);
            }.bind(this)
        });


        if(typeof this.options.load == "function") this.options.load(this);
    };

     function dragLeave(that){
        var borderColor = that.options.textColor;
        var borderCheck = that.options.border.split(" ");
        if(borderCheck.length == 3) borderColor = borderCheck[2];
        $(that.element).css({
            color: that.options.textColor,
            'border-color': borderColor
        });
    }

    function upload(that, files){
        if(that.options.preview){
            if(!checkFileType(that, files[0])){
                if(typeof that.options.error == "function"){
                    that.options.error($(that.element), "fileNotAllowed", "File is not allowerd to upload! You can only upload the following files ("+that.options.allowedFileTypes+")");
                }else
                    alert("File is not allowerd to upload! You can only upload the following files ("+that.options.allowedFileTypes+")");
                return;
            }
            if(!checkFileSize(that, files[0])) {
                if(typeof that.options.error == "function"){
                    that.options.error($(that.element), "fileToBig", 'File to big ('+humanFileSize(files[0].size)+')! Max file size is ('+that.options.maxFileSize+')');
                }else
                    alert('File to big ('+humanFileSize(files[0].size)+')! Max file size is ('+that.options.maxFileSize+')');
                return;
            }
            var reader = new FileReader();
            $(that.element).parent().find('img').remove();
            $(that.element).css({
                'z-index': that.options.zIndex,
                position: 'absolute'
            }).html('').parent().css('position', 'relative');
            var clone = $(that.element).clone();
            clone.appendTo($(that.element).parent());
            clone.replaceWith('<img class="previewImg" />');
            $(that.element).parent().find(".previewImg").css({
                width: that.options.width,
                height: that.options.height,
                border: that.options.border,
                background: that.options.background,
                color: that.options.textColor,
                'text-align': that.options.textAlign,
                'box-align': 'center',
                'box-pack': 'center'
            });
            reader.onload = function(e){
                $(this.element).parent().find('img').attr('src', e.target.result).show();
                //Image not showing on preview fix
                $(this.element).parent().find('img').height('0%').height('100%');
                if(typeof this.options.previewDone == "function") this.options.previewDone($(this.element));
            }.bind(that);
            reader.readAsDataURL(files[0]);
        }
        var key;
        if(files){
            that.options.files = files;
            if(that.options.removeComplete){
                var $removeEls = $(".progress-bar:not(.active)").parents('.extra-progress-wrapper');
                $removeEls.each(function(index, el) {
                    el.remove();
                });
            }
            var i, formData, xhr;
            if(that.options.uploadMode == 'all'){
                timerStartDate[0] = $.now();

                formData = new FormData();
                xhr = new XMLHttpRequest();

                for (i = 0; i < files.length; i++) {
                    formData.append(that.options.filesName + '[]', files[i]);
                }
                if(Object.keys(that.options.params).length > 0){
                    for(key in that.options.params){
                        formData.append(key, that.options.params[key]);
                    }
                }
                addProgressBar(that, 0);
                bindXHR(that, xhr, 0);


                xhr.open('post', that.options.url);
                xhr.setRequestHeader('Cache-Control', 'no-cache');
                xhr.send(formData);
                $(".progress").show();
            }else if(that.options.uploadMode == 'single'){
                for (i = 0; i < files.length; i++) {
                    timerStartDate[uploadIndex] = $.now();

                    formData = new FormData();
                    xhr = new XMLHttpRequest();

                    if(!checkFileType(that, files[i])){
                        addWrongFileField(that, i, uploadIndex);
                        uploadIndex++;
                        continue;
                    }
                    if(!checkFileSize(that, files[i])) {
                        addFileToBigField(that, i, uploadIndex);
                        uploadIndex++;
                        continue;
                    }
                    formData.append(that.options.filesName + '[]', files[i]);
                    if(Object.keys(that.options.params).length > 0){
                        for(key in that.options.params){
                            formData.append(key, that.options.params[key]);
                        }
                    }
                    if((!that.options.preview && that.options.uploadOnDrop) || (that.options.preview && that.options.uploadOnPreview)){

                            addProgressBar(that, i, uploadIndex);
                            bindXHR(that, xhr, i, uploadIndex);

                            xhr.open('post', that.options.url);
                            xhr.setRequestHeader('Cache-Control', 'no-cache');
                            xhr.send(formData);
                            $(".progress").show();
                            uploadIndex++;
                    }
                }
            }
        }
    }



    function startTimer(i){
        timers[i] = window.setInterval(function(){
            var $el = $(".upload-timer-" + i);

            var diff = $.now() - timerStartDate[i];

            var sec = diff / 1000;
            var min = 0;
            if(sec >= 60){
                min = Math.round(sec / 60);
                sec = sec % 60;
            }

            $el.text(min + ":" + pad(sec.toFixed(2), 5));

        }, 10);
    }

    function pad (str, max) {
        str = str.toString();
        return str.length < max ? pad("0" + str, max) : str;
    }

    function bindXHR(that, xhr, i, index){
        $(xhr.upload).bind({
            progress: function(e){
                if(e.originalEvent.lengthComputable){
                    var percent = e.originalEvent.loaded / e.originalEvent.total * 100;
                    if(typeof that.options.progress == "function") that.options.progress(percent, index);
                    else{
                        $(".progress-"+index).children().css("width", percent+"%").html(percent.toFixed(0)+"%");
                    }
                }
            },
            loadstart: function(e, a, b, c){
                startTimer(index);
            }
        });

        xhrDone[index] = false;

        $(xhr).bind({
            readystatechange: function(){
                if(this.readyState == 4 && this.status == 200){
                    changeXhrDoneStatus(index);
                    $(".progress.progress-"+index).children().removeClass('active');
                    if(typeof that.options.success  == "function") that.options.success(this, index);
                }
            }
        });

        var interval = setInterval(function(){
            if(Object.keys(xhrDone).length > 0){
                var allOk = {};

                for(var indexT in xhrDone){
                    if(xhrDone[indexT] === true) allOk[indexT] = true;
                }

                if(Object.keys(xhrDone).length == Object.keys(allOk).length){
                    clearInterval(interval);
                    xhrDone = {};
                    if(typeof that.options.uploadDone == "function") that.options.uploadDone($(that.element));
                }
            }
        }, 500);
    }

    function changeXhrDoneStatus(i){
        xhrDone[i] = true;
        clearInterval(timers[i]);
    }

    function addProgressBar(that, i, index){
        $(that.element).parent()
            .append('<div class="progress progress-'+index+'"></div>')
            .css({'margin': that.options.margin});
        $(".progress-"+index).css({
            width: that.options.progressBarWidth,
            margin: '20px 0 0 0',
        }).append('<div class="progress-bar progress-bar-info progress-bar-striped active"></div>').hide();
        $(".progress-" + index).wrap('<div class="extra-progress-wrapper"></div>');
        //$(".progress-" + index).parent().append('<span title="'+that.options.files[i].name+'">'+that.options.files[i].name.trunc(20)+'</span>').css("width", that.options.progressBarWidth);
        if(that.options.showTimer){
            $(".progress-" + index).parent().append('<span style="float:right" class="upload-timer-'+index+'">0</span>');
        }
    }

    function addFileToBigField(that, i, index){
        $(that.element).parent()
            .append('<div class="progress error-progress-'+index+'"></div>')
            .css('margin', that.options.margin);
        var file = that.options.files[i];
        var fileName = file.name.trunc(25);
        $(".error-progress-"+index).css({
            width: that.options.progressBarWidth,
            margin: '20px 0 0 0'
        }).append('<div class="progress-bar progress-bar-danger progress-bar-striped" style="width:100%">File to big ('+humanFileSize(file.size)+')</div>');
        $(".error-progress-" + index).wrap('<div class="extra-progress-wrapper"></div>').css("width", that.options.progressBarWidth);
        $(".error-progress-" + index).parent().append('<span title="'+that.options.files[i].name+'">'+fileName+'</span>');
    }

    function addWrongFileField(that, i, index){
        $(that.element).parent()
            .append('<div class="progress error-progress-'+index+'"></div>')
            .css('margin', that.options.margin);
        var file = that.options.files[i];
        var fileName = file.name.trunc(25);
        var extension = file.name.substr(file.name.lastIndexOf('.') + 1);
        $(".error-progress-"+index).css({
            width: that.options.progressBarWidth,
            margin: '20px 0 0 0'
        }).append('<div class="progress-bar progress-bar-danger progress-bar-striped" style="width:100%">File type ('+extension+') is not allowed</div>');
        $(".error-progress-" + index).wrap('<div class="extra-progress-wrapper"></div>').css("width", that.options.progressBarWidth);
        $(".error-progress-" + index).parent().append('<span title="'+that.options.files[i].name+'">'+fileName+'</span>');
    }

    function showTooltip(){
        $("span").tooltip({
            open: function(event, ui){
                ui.tooltip.css("max-width", '100%');
            }
        });
    }

    function checkFileType(that, file){
        if (!file.type && file.size%4096 === 0) return false;
        if(that.options.allowedFileTypes == '*') return true;

        var extension = file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase();

        var allowedTypes = that.options.allowedFileTypes.replace(' ', '').split(",");
        var allowedTypesLower = [];

        for (var i = allowedTypes.length - 1; i >= 0; i--) {
            if(allowedTypes[i].indexOf(".") != -1){
                if(file.type.match(allowedTypes[i]) !== null) return true;
            }
            allowedTypesLower.push(allowedTypes[i].toLowerCase());
        }

        if($.inArray(extension, allowedTypesLower) != -1) return true;

        return false;
    }
    var validAmount  = function(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    };

    var parsableUnit = function(u) {
        return u.match(/\D*/).pop() === u;
    };

    var incrementBases = {
      2: [
        [["B", "Bytes"], 1],
        [["Kb"], 128],
        [["k", "K", "kb", "KB", "KiB", "Ki", "ki"], 1024],
        [["Mb"], 131072],
        [["m", "M", "mb", "MB", "MiB", "Mi", "mi"], Math.pow(1024, 2)],
        [["Gb"], 1.342e+8],
        [["g", "G", "gb", "GB", "GiB", "Gi", "gi"], Math.pow(1024, 3)],
        [["Tb"], 1.374e+11],
        [["t", "T", "tb", "TB", "TiB", "Ti", "ti"], Math.pow(1024, 4)],
        [["Pb"], 1.407e+14],
        [["p", "P", "pb", "PB", "PiB", "Pi", "pi"], Math.pow(1024, 5)],
        [["Eb"], 1.441e+17],
        [["e", "E", "eb", "EB", "EiB", "Ei", "ei"], Math.pow(1024, 6)]
      ],
      10: [
        [["B", "Bytes"], 1],
        [["Kb"], 125],
        [["k", "K", "kb", "KB", "KiB", "Ki", "ki"], 1000],
        [["Mb"], 125000],
        [["m", "M", "mb", "MB", "MiB", "Mi", "mi"], 1.0e+6],
        [["Gb"], 1.25e+8],
        [["g", "G", "gb", "GB", "GiB", "Gi", "gi"], 1.0e+9],
        [["Tb"], 1.25e+11],
        [["t", "T", "tb", "TB", "TiB", "Ti", "ti"], 1.0e+12],
        [["Pb"], 1.25e+14],
        [["p", "P", "pb", "PB", "PiB", "Pi", "pi"], 1.0e+15],
        [["Eb"], 1.25e+17],
        [["e", "E", "eb", "EB", "EiB", "Ei", "ei"], 1.0e+18]
      ]
    };


    function filesizeParser(input) {
      var options = arguments[1] || {};
      var base = parseInt(options.base || 2);

      var parsed = input.toString().match(/^([0-9\.,]*)(?:\s*)?(.*)$/);
      var amount = parsed[1].replace(',','.');
      var unit = parsed[2];

      var validUnit = function(sourceUnit) {
        return sourceUnit === unit;
      };

      if (!validAmount(amount) || !parsableUnit(unit)) {
        throw 'Can\'t interpret ' + (input || 'a blank string');
      }
      if (unit === '') return amount;

      var increments = incrementBases[base];
      for (var i = 0; i < increments.length; i++) {
        var _increment = increments[i];

        if (_increment[0].some(validUnit)) {
          return amount * _increment[1];
        }
      }

      throw unit + ' doesn\'t appear to be a valid unit';
    }

    function checkFileSize(that, file){

        return file.size < filesizeParser(that.options.maxFileSize);
    }

    function humanFileSize(bytes) {
        var thresh = 1024;
        if(Math.abs(bytes) < thresh) {
            return bytes + ' Bytes';
        }
        var units = ['KB', 'MB', 'GB', 'TB'];
        var u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while(Math.abs(bytes) >= thresh && u < units.length - 1);
        return bytes.toFixed(1)+' '+units[u];
    }
    String.prototype.trunc = String.prototype.trunc || function(n){
          return this.length>n ? this.substr(0,n-1)+'&hellip;' : this;
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function ( options ) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                $.data(this, 'plugin_' + pluginName,
                new Plugin( this, options ));
            }
        });
    };

})( jQuery, window , document );
