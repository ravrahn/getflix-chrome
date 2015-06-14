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
    // Fetch the JSON regions list
    var services = '';
    $.ajax({
        type: 'GET',
        url: 'https://www.getflix.com.au/api/v1/regions/list.json',
        username: apiKey,
        password: 'x',
        async: false,
        success: function(data) {
            services = data;
        }
    });

    // we're gonna set this up later, inside the netflix tab
    delete services["netflix-subs"];

    // for every service, add a dropdown option
    for (var code in services) {
        var service = services[code];
        console.log(service);
    }
    // for every region in every service, add a list option w/ flag
    for (var code in services) {
        var service = services[code];
        var regions = service.regions;
        console.log(service.name);
        for (var regionCode in regions) {
            var region = regions[regionCode];
            // get the country name from the list in countries.js
            // because lots of web requests would be awful
            region.country = countries[regionCode];
            if (region.country == undefined) {
                region.country = "Turn Off";
            }
            console.log(region.country);
        }
        console.log("");
    }
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
