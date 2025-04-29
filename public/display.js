function handleSearch(event) {
    event.preventDefault();
        const query = document.getElementById('searchInput').value.trim();
        localStorage.setItem('query', query);
        if (query) {
            page = 1;
            document.getElementById("artwork").innerHTML = ''; // Clear existing results
            fetchArtwork(query);
        } else { alertBox('Please enter a term to search for.', 'empty');}
    }
    // get API
    function fetchArtwork(query) {
        if (isLoading) return; // Prevent fetching if already in progress
        isLoading = true;

        fetch(`https://api.artic.edu/api/v1/artworks/search?q=${query}&fields=title,image_id,artist_title,artist_display,classification_titles,description,date_display&&page=${page}&limit=9`)
            .then(res => {return res.text();})
            .then(data => {
                data = JSON.parse(data)
                displayArtworks(data.data);
                setCurrentDisplayArtworks(data.data);
                page++; // Increment page for the next request
            })
            .catch(error => {
                console.log('Error fetching artwork: ', error);
            })
            .finally( () => {
                isLoading = false; 
            });
    }

    // converts a json object of artworks to a string, then sets it in localStorage
    function setCurrentDisplayArtworks(artworks) {
        const artworksString = JSON.stringify(artworks);
        localStorage.setItem('artworks', artworksString);
    }

    // returns a JSON object of artworks from localStorage
    function getCurrentDisplayArtworks() {
        let artworksString = localStorage.getItem('artworks');
        return JSON.parse(artworksString);
    }

    async function retrieveArtworks() {
        let artArray = [];
        let currentGalleryId = localStorage.getItem('selectedGalleryId');
        if (currentGalleryId !== null && currentGalleryId !== "null") {
            try {
                const response = await fetch(`/api/galleries/${currentGalleryId}/artworks`);
                const data = await response.json();
                if (data.status === 'success') {
                    artArray = data.artworks;
                }
            } catch (error) {
                console.error('Error retreiving artwork: ', error);
                return artArray;
            }
        }
        return artArray;
    }

    // Display the artwork in the page
    async function displayArtworks(artworks) {
        const container = document.getElementById("artwork");
        let i = 0;

        const artArray = await retrieveArtworks();

        artworks.forEach(artwork => {
            art_each = document.createElement("div");
            art_each.innerHTML = `
                <img src="${`https://www.artic.edu/iiif/2/${artwork.image_id}/full/400,/0/default.jpg`}">
                    <button class="save-btn" id="save-btn-${i}"><i class="fas fa-bookmark"></i></button>
                     <!-- ADD DATABASE CONNECTION HERE WHEN SAVE IS CLICKED -->
                    <h3 style="margin-bottom:5px; margin-top: 10px">${artwork.title}</h3>
                    <p"margin-bottom:0px; ">${artwork.artist_title}, ${artwork.date_display}</p>
                    <!-- EXTRA ART DATA IS HERE (but not displayed on screen. Put in database?) -->
                    <!-- <p>${artwork.artist_display}</p> -->
                    <!-- <p>${artwork.classification_titles}</p>-->
            `;
            container.appendChild(art_each);
            
            // add an event listener to the button
            const btn = document.getElementById(`save-btn-${i}`);
            
            updateSaveButtonHandler(btn, artwork);

            // add saved class if the art is already in the selected gallery
            const artworkExists = artArray.some(art => art.image_id === artwork.image_id);
            if (artworkExists) {
                btn.classList.add('saved');
            }

            i++;
        });
    }
    function checkScrollPosition() {
        const scrollPosition = window.innerHeight + window.scrollY;
        const bottomPosition = document.documentElement.scrollHeight;
        
        if (scrollPosition >= bottomPosition - 100) { 
            // fetch again
            const query = document.getElementById('searchInput').value.trim();
            if (query) {
                fetchArtwork(query); 
            }
        }
    }

    // reload artwork in the page
    async function reloadArtworks() {
        // Clear existing artworks
        document.getElementById("artwork").innerHTML = '';
        // Reload artwork
        const artworks = getCurrentDisplayArtworks();
        await displayArtworks(artworks);
    }

    // Update the save button handler to show which gallery is selected
    function updateSaveButtonHandler(btn, artwork) {
        btn.addEventListener('click', async () => {
            let currentGalleryId = localStorage.getItem('selectedGalleryId');
            console.log(typeof currentGalleryId);
            console.log(currentGalleryId);
            if (currentGalleryId === "null" || currentGalleryId === null) {
                alertBox('Please create a gallery first or select an existing gallery from the View Galleries menu', "error");
                return;
            }

            try {
                // fetch artworks in current gallery
                const response = await fetch(`/api/galleries/${currentGalleryId}/artworks`);
                const data = await response.json();
                if (data.status === 'success') {
                    const artworks = data.artworks;
                    const exists = artworks.some(art => art.image_id === artwork.image_id);
                    // delete artwork if it exists
                    if (exists) {
                        const remResponse = await fetch(`/api/galleries/${currentGalleryId}/artworks/${artwork.image_id}`, {
                            method: 'DELETE'
                        });
                        const remData = await remResponse.json();
                        if (remData.status === 'success') {
                            btn.innerHTML = `<i class="far fa-bookmark"></i>`;
                            btn.classList.remove('saved');
                            alertBox(`Artwork removed from Gallery`, "remove");
                        } else {
                            const alertText = (remData.message || 'Failed to remove artwork');
                            alertBox(alertText, 'error');
                        }
                    } else {    // add it otherwise
                        const addResponse = await fetch(`/api/galleries/${currentGalleryId}/artworks`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(artwork)
                        });
                        const addData = await addResponse.json();
                        if (addData.status === 'success') {
                            btn.innerHTML = '<i class="fas fa-bookmark"></i>';
                            btn.classList.add('saved');                                
                            alertBox(`Artwork saved to Gallery ${addData.gallery.number}!`, 'add');
                        } else {
                            const alertText = (addData.details || 'Failed to save artwork');
                            alertBox(alertText, 'error');
                        }
                    }
                }

            } catch (error) {
                console.error('Error saving/deleting artwork:', error);
                alertBox('Failed to save/delete artwork', 'error');
            }
        });
    }

    function alertBox(text, type) {
        const alert = document.getElementById("alert");
        alert.style.display = "block";
        if (type === "success" || type === "add") {
            alert.style.backgroundColor = "#04aa6d";
        } else if (type === "create" || type === "select") {
            alert.style.backgroundColor = "#2196F3";
        } else if (type === "error") {
            alert.style.backgroundColor = "#f39d21";
        } else {
            alert.style.backgroundColor = "red";
        }
    
    
        document.getElementById("alert-text").innerHTML = text;
    } 