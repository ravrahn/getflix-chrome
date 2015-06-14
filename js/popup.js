// FUNCTIONS

// Use the API to get an active user profile if one exists (ie, if someone is logged on)
function getUserProfile() {
    var profile;
    $.ajax({
        type: 'GET',
        url: 'https://www.getflix.com.au/api/v1/profile.json',
        async: false,
        success: function(data) {
            profile = data;
        }
    });
    return profile;
}

// Use json given as the regions parameter to create the region-switching UI
function generateTabs(regions) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
            var regions = JSON.parse(xhr.responseText);

            var tabs = '<div class="tabs-container"><ul class="tabs">';

            for (var i = 0; i < regions.length; i++) {
                tabs += '<li id="' + regions[i].code + '">' + regions[i].name + '</li>';
            }

            tabs += '</ul></div>\n<div class="content-wrapper">';

            for (var i = 0; i < regions.length; i++) {
                tabs += '<ul id="' + regions[i].code + '" class="region-list f16" role="option">';

                for (var j = 0; j < regions[i].regions.length; j++) {
                    tabs += '<li id="' + regions[i].regions[j].code + '"><div class="flag ' + regions[i].regions[j].code.toLowerCase() + '"></div>' + regions[i].regions[j].name + '</li>';
                }

                tabs += '</ul>';
            }

            tabs += '</div>';

            $('body').append(tabs);

            var columns = Math.ceil((regions.length / 3));

            $('body').width((10 * columns) + 'rem');
            $('.region-list').css('-webkit-column-count', columns + '');

            // move the tabs with the cursor to account for the fact that they're wider than the screen
            $('.tabs-container').mousemove(function(e) {
                var offset = $(this).offset();
                var posRatio = (e.pageX - offset.left) / $(this).width();
                var maxShift = $('.tabs').width() - $(this).width();
                $('.tabs').css('margin-left', -maxShift * posRatio);
            });

            // when a tab is clicked on, switch to it
            // for (var i=0; i < regions.length; i++) {
            // $('.tabs #' + regions[i].code).click(function() {
            $('.tabs li').click(function() {
                var code = $(this).attr('id')
                switchTab(code);
            });
            // }

            $('.region-list li').click(function() {
                var region = $(this).attr('id');
                var service = $(this).parent().attr('id');
                var currRegion = getRegion(service);

                if (currRegion !== region) {
                    $(this).children('.flag').addClass('spinner');
                    setRegion(service, region);
                }

            });

            switchTab('netflix');

        }
    }
    xhr.open('GET', chrome.extension.getURL('/regions.json'), true);
    xhr.send();
}

// switches to a new tab
function switchTab(newTab) {
    $('.tabs li').each(function() {
        if ($(this).attr('id') === newTab) {
            $(this).addClass('active-tab');
        } else {
            $(this).removeClass('active-tab');
        }
    });
    $('.region-list').each(function() {
        if ($(this).attr('id') === newTab) {
            $(this).addClass('active-list');
        } else {
            $(this).removeClass('active-list');
        }
    });

    var currRegion = getRegion(newTab);
    boldRegion(newTab, currRegion);

    $('body').height($('.tabs-wrapper').height());
    $('html').height($('.tabs-wrapper').height());
}

// Find the current region of a particular service
function getRegion(service) {
    var region = '';
    $.ajax({
        type: 'GET',
        url: 'https://www.getflix.com.au/api/v1/regions.json',
        username: apiKey,
        password: 'x',
        async: false,
        success: function(data) {
            for (var i = 0; i < data.length; i++) {
                var currService = data[i].service;
                var currRegion = data[i].region;

                if (currService == service) {
                    region = currRegion;
                }
            }
        }
    });
    return region;
}

// Set the region of a particular service
// Returns whether it worked
function setRegion(service, region) {
    var currRegion = getRegion(service, apiKey);
    if (region !== currRegion) {
        $.ajax({
            type: 'POST',
            url: 'https://www.getflix.com.au/api/v1/regions.json',
            processData: true,
            contentType: 'application/json',
            username: apiKey,
            password: 'x',
            data: JSON.stringify({
                "service": service,
                "region": region
            }),
            success: function(data) {
                $('#' + service + '.region-list #' + region).children('.flag').removeClass('spinner');
                boldRegion(service, region);

                // Refresh Netflix if it's the current tab
                chrome.tabs.query({
                    active: true,
                    currentWindow: true
                }, function(arrayOfTabs) {
                    if (arrayOfTabs[0].url.indexOf('netflix.com') > -1) {
                        var code = 'window.location.reload();';
                        chrome.tabs.executeScript(arrayOfTabs[0].id, {
                            code: code
                        });
                    }
                });
            }
        });
    }
}

function boldRegion(service, region) {
    console.log('bolding');
    console.log(region);
    $('#' + service + '.region-list li').each(function() {
        console.log(this);
        if ($(this).attr('id') === region) {
            $(this).addClass('active-region');
        } else {
            $(this).removeClass('active-region');
        }
    });
}


// 1. check dns
// 2. create tabs
// 3. hide other tabs content

// MAIN

var profile = getUserProfile();
var apiKey = profile.api_key;

// Check DNS. If true, load tabs from the JSON.
$.getJSON('https://check.getflix.com.au/?format=json', function(data) {
    if (data.dns) { // dns returned true
        // report success
        $('.dns').html('Service test passed!');
        // wait a bit, and then generate the tabs
        setTimeout(function() {
            $('.dns').remove();

            generateTabs();

        }, 250);
    } else { // dns returned false
        // report failure, link to help
        $('.dns').html('Service test failed.<br ><a href="https://www.getflix.com.au/login">Click here</a> to log in.<br >If you are logged in, <a href="https://www.getflix.com.au/setup/overview" target="_blank">click here</a> for setup information.');
    }
});
