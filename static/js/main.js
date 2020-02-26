google.load("feeds", "1");
google.setOnLoadCallback(showFeed);

$(document).ready(function() {
    if( /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent)) {
        $('#panel1').css({position: 'static', marginTop: 100});
        $('#panel2').css({marginTop: 0});
    }

    $(window).on('hashchange', function() {
        scrollTo(location.hash);
    });

    scrollTo(location.hash);
    
    bindSignup();
    
    //prev();
});
(function() {

    $(".dropzone").dropzone({
        url: 'upload.php',
        margin: 20,
        params:{
            'action': 'save'
        },
        success: function(res, index){
            console.log(res, index);
        }
    });

   
    
}());
function scrollTo(hash)
{
    var scrollTo = 0;
    var nav = hash.split('#')

    if (nav.length > 1)
    {
        nav = nav[1];
        var header = $('#header');

        var top = 0;
        if (header.css('position') == 'fixed')
            top = header.height();

        scrollTo = $('[data-nav=' + nav + ']').offset().top - top;
    }
    
    $('html, body').stop().animate({
        scrollTop: scrollTo
    }, 1000);    
}

function showFeed()
{
    var feed = new google.feeds.Feed("http://lubax.com/blog/?feed=rss");

    // feed.setNumEntries(5);
    feed.setResultFormat(google.feeds.Feed.JSON_FORMAT);

    feed.load(function(result) {

        if (!result.feed || !result.feed.entries || result.feed.entries.length == 0)
        {
            $('#panel8').hide();
            return;
        }

       

        var cont = $('#panel8 .panel-inside');

        $.each(result.feed.entries, function(){
            console.log(this)
            var entry = $('<a class="feed-entry"/>').attr('href', this.link).append($('<div class="feed-icon pic-icon"/>')).appendTo(cont);
            entry.append($('<div class="feed-title"/>').text(this.title))
        });

        console.log(result);
    });
}

function bindSignup()
{
    $('#submit').click(function(e){
        var name = $('#name').val();
        var email = $('#email').val();
        
        if ($.trim(name) == '' || $.trim(email) == '')
        	return false;

		$('#signup_form').hide('slide', {direction: 'left'}, function(){
			$('#signup_done').slideDown();
		});
		            
        $.post('beta.php',{name: name, email: email});

        return false;
    })
}

function prev()
{
	$('<div style="background-color:rgba(0,0,0,.7);position:fixed;bottom:0;right:20px;color:#FFF;z-index:100;border-top-left-radius:5px;border-top-right-radius:5px;padding:3px 10px">Development Preview</div>').appendTo($('body'));
}
