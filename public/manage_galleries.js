    
    
// Add a function to set the current gallery
async function setCurrentGallery(galleryId) {
    localStorage.setItem('selectedGalleryId', galleryId);
    alertBox("Gallery selected! You can now save artworks to this gallery.", "select");
    document.getElementById('galleries-modal').style.display = 'none';
    await reloadArtworks();
}

async function createGallery() {
    try {
        const response = await fetch('/api/galleries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (data.status === 'success') {
            localStorage.setItem('selectedGalleryId', data.gallery.id);
            alertBox(`Gallery ${data.gallery.number} created successfully! You can now save artworks to this gallery.`, 'create');
            await viewGalleries();
        } else {
            const alertText = (data.details || 'Failed to create gallery');
            alertBox(alertText, 'error');
        }
    } catch (error) {
        console.error('Error creating gallery:', error);
        alertBox('Failed to create gallery', 'error');
    }
}

async function viewGalleries() {
    try {
        document.getElementById('galleries-modal').style.display = 'block';
        const response = await fetch('/api/galleries');
        const data = await response.json();
        
        if (data.status === 'success') {
            const galleriesList = document.getElementById('galleries-list');
            galleriesList.innerHTML = '';
            
            if (data.galleries.length === 0) {
                galleriesList.innerHTML = `
                    <div class="empty-gallery">
                        <p>You don't have any galleries yet. Create one to start saving artworks!</p>
                    </div>
                `;
                return;
            }
            
            data.galleries.forEach(gallery => {
                const galleryItem = document.createElement('div');
                galleryItem.className = 'gallery-item';
                
                const formattedDate = new Date(gallery.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                galleryItem.innerHTML = `

                    <div class="gallery-header">
                        <div>
                            <h3 class="gallery-title" id="gallery-title-link-${gallery.number}"><a href="galleryview.html?id=${gallery.id}&num=${gallery.number}" style="text-decoration: none; color: inherit;" >
            Gallery ${gallery.number}
        </a></h3>
                            <div class="gallery-meta">
                                Created on ${formattedDate} • ${gallery.artworkCount} artwork${gallery.artworkCount !== 1 ? 's' : ''}
                            </div>
                        </div>
                        <div class="gallery-actions">
                            <a href="galleryview.html?id=${gallery.id}&num=${gallery.number}" id="view-btn-${gallery.number}">
                                <button class="gallery-btn view-btn">
                                    View
                                </button>
                            </a>
                            <button onclick="setCurrentGallery('${gallery.id}')" class="gallery-btn select-btn">
                                Select
                            </button>
                            <button onclick="deleteGallery('${gallery.id}')" class="gallery-btn delete-btn">
                                Delete
                            </button>
                        </div>
                    </div>
                    <div class="gallery-artworks">
                        ${gallery.artworks.length > 0 ? 
                            gallery.artworks.map(artwork => `
                                <div class="artwork-item">
                                    <a href="galleryview.html?id=${gallery.id}&num=${gallery.number}">
                                    <img src="https://www.artic.edu/iiif/2/${artwork.image_id}/full/400,/0/default.jpg" 
                                         alt="${artwork.title}">
                                                             </a>

                                    <div class="artwork-info">
                                        ${artwork.title}<br>
                                        ${artwork.artist_title}
                                    </div>
                                </div>
                            `).join('') :
                            '<div class="empty-gallery">No artworks in this gallery yet</div>'
                        }
                    </div>
            
                `;
                
                galleriesList.appendChild(galleryItem);

                const btn = document.getElementById(`view-btn-${gallery.number}`);
                const galleryTitle = document.getElementById(`gallery-title-link-${gallery.number}`);
                updateViewGalleryHandler(btn, galleryTitle, gallery);
            });
        }
    } catch (error) {
        console.error('Error fetching galleries:', error);
        alertBox('Failed to fetch galleries', 'error');
    }
}

function updateViewGalleryHandler(btn, galleryTitle, gallery) {
    if (gallery.artworks.length <= 0) {
        btn.style.display = "none";
        galleryTitle.innerText = `Gallery ${gallery.number}`;
        console.log(gallery.number);
    }
}

async function deleteGallery(galleryId) {
    if (!confirm('Are you sure you want to delete this gallery? This action cannot be undone.')) {
        return;
    }
    // get current galleryId from localStorage
    let currentGalleryId = localStorage.getItem('selectedGalleryId');

    try {
        const response = await fetch(`/api/galleries/${galleryId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();

        if (data.status === 'success') {
            if (currentGalleryId === galleryId) {
                localStorage.setItem('selectedGalleryId', null);
            }
            alertBox('Gallery deleted successfully!', "delete");

            await reloadArtworks();
            await viewGalleries();
        } else {
            const alertText = (data.details || 'Failed to delete gallery');
            alertBox(alertText, "error");
        }
    } catch (error) {
        console.error('Error deleting gallery:', error);
        alertBox('Failed to delete gallery', "error");
    }
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