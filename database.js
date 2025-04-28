const mongoose = require('mongoose');
const express = require('express');
const app = express();
const path = require('path');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();


const PORT = process.env.PORT || 3000;
const Schemas = require('./Schemas.js');

// MongoDB connection URL
const url = "mongodb+srv://alexanderlee:wacqob%2DtAvqyv%2Ddaspy1@cluster0.nvg6vsl.mongodb.net/ArtCurator?retryWrites=true&w=majority&appName=Cluster0";

// Connect to MongoDB
mongoose.connect(url)
    .then(() => {
        console.log('✅ MongoDB connection successful');
        // Start the server only after MongoDB connection is established
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1); // Exit if we can't connect to MongoDB
    });

// Parse JSON bodies
app.use(express.json());

// Google OAuth configuration
const GOOGLE_CLIENT_ID = '16218638873-e13qud162q6q342aqg8f0pu7pmgeu2bb.apps.googleusercontent.com';
const GOOGLE_CLIENT_SECRET = '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';

// Configure session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Configure Passport
passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
function(accessToken, refreshToken, profile, email , cb) {
    console.log(profile);
    User.findOrCreate({ username: profile.displayName, googleId: profile.id }, function (err, user) {
        return cb(err, user);
    });
    }
    ));

// Serialize and deserialize user
passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await Schemas.User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Google authentication routes
app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Update the callback route to handle the Google Sign-In token
app.post('/auth/google/callback', async (req, res) => {
    try {
        console.log('Received request body:', req.body);
        
        if (!req.body || !req.body.credential) {
            console.error('No credential in request body');
            return res.status(400).json({ 
                error: 'Invalid request',
                details: 'No credential provided in request body'
            });
        }

        const credential = req.body.credential;
        
        // Verify the credential with Google's API
        const client = new OAuth2Client(GOOGLE_CLIENT_ID);
        
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: GOOGLE_CLIENT_ID
        });
        
        const payload = ticket.getPayload();
        console.log('Google payload:', payload);
        const userid = payload['sub'];

        // Check if user exists in the database (either by googleId or email)
        let user = await Schemas.User.findOne({
            $or: [{ googleId: userid }, { email: payload.email }]
        });
        
        if (!user) {
            // Ensure username is generated correctly
            const username = payload.given_name && payload.family_name 
                ? `${payload.given_name}_${payload.family_name}`
                : payload.email.split('@')[0];  // Use email as fallback

            // Create new user if doesn't exist
            user = await Schemas.User.create({
                googleId: userid,
                name: payload.name || `${payload.given_name} ${payload.family_name}`,
                email: payload.email,
                username: username,
                galleries: [],
                premium: false
            });
        }

        // Log the user in
        req.login(user, (err) => {
            if (err) {
                console.error('Login error:', err);
                return res.status(500).json({ 
                    error: 'Login failed',
                    details: err.message 
                });
            }
            return res.json({ 
                status: 'success', 
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            });
        });
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ 
            error: 'Authentication failed', 
            details: error.message 
        });
    }
});




// Logout route
app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
};
// for separate gallery page
app.get('/galleryview.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'galleryview.html'));
});

// Constants for gallery limits
const MAX_GALLERY_NUM = 5;
const MAX_GALLERY_SIZE = 10;

// async function addToGalleries(artwork, current_user, gallery_id) {
//     console.log(`Connecting to MongoDB`);
//     await mongoose.connect(url);
//     const db = mongoose.connection;
//     db.on('error', console.error.bind(console, 'error: '));
//     db.once('open', async function() {
//         try {
//             console.log(`✅ Connection successful with a readyState of: ${db.readyState}`);
            
//             var currGallery = await addGalleryToDB(current_user, gallery_id);

//             // add the art to the gallery
//             if (currGallery != null) {
//                 await addArtToGallery(artwork, currGallery);
//             }
//         }
//         catch(err) {
//             console.log(`Error pushing artwork: ${err}`);
//         }
//         await db.close();
//     });
//     /* search for gallery index number */
//     const targetId = gallery_id.toString();
//     const index = current_user.galleries
//                     .map(id => id.toString())
//                     .indexOf(targetId);
//     return index;
// }

// async function addGalleryToDB(current_user, gallery_id) {
//     // find current gallery as obj
//     try {
//         let currGallery = await Schemas.Gallery.findOne({ '_id': gallery_id });
//         if (currGallery === null) {
//             console.log(`Gallery not found. Creating Gallery..`)
//             currGallery = await Schemas.Gallery.create({ _id:gallery_id, artworks: [], user_id: current_user });
//         } else {
//             console.log(`Gallery found: ${gallery_id}`);
//         }
//         return currGallery;
//     }
//     catch (err) {
//         console.log(`Error creating gallery: ${err}`);
//     }
//     return null;
// }

// async function addArtToGallery(artwork, galleryObj) {
//     // search the gallery for the piece to add
//     try {
//         const exists = await Schemas.Gallery.findOne({ 
//             _id: galleryObj._id,
//             artworks: {
//                 $elemMatch: {
//                     title: artwork.title
//                 }
//             }
//         });
//         // push to artworks array if not found
//         if (exists === null) {
//             if (galleryObj.artworks.length === MAX_GALLERY_SIZE) {
//                 const out = "You have reached the maximum amount of artworks per gallery."
//                 console.log(out);
//                 alert(out);
//             } else {
//                 await Schemas.Gallery.updateOne(
//                     { _id:galleryObj._id }, { $push: { artworks: artwork } }
//                 );
//                 console.log(`Art added to gallery: ${galleryObj._id}`);
//             }
//         } else {
//             console.log(`The artwork ${artwork.title} already exists in this gallery`);
//         }
//     } catch (err) {
//         console.log(`Error searching for and pushing to gallery: ${err}`);
//     }
// }

// load homepage and css
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'homepage.html'));
});


// User information endpoint
app.get('/api/user', (req, res) => {
    if (req.isAuthenticated()) {
        console.log('User data:', req.user);
        res.json({ 
            user: {
                id: req.user._id,
                name: req.user.name,
                email: req.user.email
            }
        });
    } else {
        res.json({ user: null });
    }
});

// Protect the save-art endpoint
app.post('/api/save-art', isAuthenticated, async (req, res) => {
    const artwork = req.body;
    const current_user = req.user;

    // send success and saved artwork
    console.log(`Received artwork: ${artwork.title.toString()}`);

    // add current piece to selected gallery
    const galleryNum = await addToGalleries(artwork, current_user, selectedGallery) + 1;

    console.log(`Artwork added to Gallery Number ${galleryNum}`);

    res.json( { status: 'success', saved_gallery: galleryNum });
});

// Create a new gallery for a user
app.post('/api/galleries', isAuthenticated, async (req, res) => {
    try {
        const user = req.user;
        
        // Check if user has reached maximum number of galleries
        if (user.galleries.length >= MAX_GALLERY_NUM) {
            return res.status(400).json({
                error: 'Maximum galleries reached',
                details: `You can only create up to ${MAX_GALLERY_NUM} galleries`
            });
        }

        // Determine the new gallery index by finding the last gallery created
        let galleryNumber = 1;
        let lastGallery = await Schemas.Gallery.findOne({ user_id: user.id }).sort({ createdAt: -1 });
        console.log(lastGallery);
        if (lastGallery != null) {
            galleryNumber = lastGallery.number + 1;
        }
        // assign a new ObjectId to the new gallery
        let galleryId = new mongoose.Types.ObjectId();

        // Create new gallery
        const newGallery = new Schemas.Gallery({
            _id: galleryId,
            user_id: user._id,
            artworks: [],
            number: galleryNumber
        });

        // Save the gallery first
        await newGallery.save();

        // Add gallery to user's galleries array
        user.galleries.push(galleryId);
        await user.save();

        res.json({
            status: 'success',
            gallery: {
                id: galleryId,
                artworks: [],
                number: galleryNumber
            }
        });
    } catch (error) {
        console.error('Error creating gallery:', error);
        res.status(500).json({
            error: 'Failed to create gallery',
            details: error.message
        });
    }
});

// Get all galleries for a user
app.get('/api/galleries', isAuthenticated, async (req, res) => {
    try {
        const user = req.user;
        const galleries = await Schemas.Gallery.find({ user_id: user._id })
            .sort({ createdAt: -1 }); // Sort by creation date, newest first
        
        res.json({
            status: 'success',
            galleries: galleries.map(gallery => ({
                id: gallery._id,
                artworkCount: gallery.artworks.length,
                createdAt: gallery.createdAt,
                artworks: gallery.artworks,
                number: gallery.number
            }))
        });
    } catch (error) {
        console.error('Error fetching galleries:', error);
        res.status(500).json({
            error: 'Failed to fetch galleries',
            details: error.message
        });
    }
});

// Delete a gallery
app.delete('/api/galleries/:galleryId', isAuthenticated, async (req, res) => {
    try {
        const { galleryId } = req.params;
        const user = req.user;

        // Verify gallery belongs to user
        if (!user.galleries.includes(galleryId)) {
            return res.status(403).json({
                error: 'Unauthorized',
                details: 'This gallery does not belong to you'
            });
        }

        // Remove gallery from database
        await Schemas.Gallery.findByIdAndDelete(galleryId);

        // Remove gallery from user's galleries array
        user.galleries = user.galleries.filter(id => id.toString() !== galleryId);
        await user.save();

        res.json({
            status: 'success',
            message: 'Gallery deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting gallery:', error);
        res.status(500).json({
            error: 'Failed to delete gallery',
            details: error.message
        });
    }
});

// Add artwork to a gallery
app.post('/api/galleries/:galleryId/artworks', isAuthenticated, async (req, res) => {
    try {
        const { galleryId } = req.params;
        const artwork = req.body;
        const user = req.user;

        // Verify gallery belongs to user
        if (!user.galleries.includes(galleryId)) {
            return res.status(403).json({
                error: 'Unauthorized',
                details: 'This gallery does not belong to you'
            });
        }

        const gallery = await Schemas.Gallery.findById(galleryId);
        
        // Check if gallery is full
        if (gallery.artworks.length >= MAX_GALLERY_SIZE) {
            return res.status(400).json({
                error: 'Gallery full',
                details: `You can only add up to ${MAX_GALLERY_SIZE} artworks per gallery`
            });
        }

        // Check if artwork already exists in gallery
        const artworkExists = gallery.artworks.some(art => art.image_id === artwork.image_id);
        if (artworkExists) {
            return res.status(400).json({
                error: 'Duplicate artwork',
                details: 'This artwork is already in your gallery'
            });
        }

        // Add artwork to gallery
        gallery.artworks.push(artwork);
        await gallery.save();

        res.json({
            status: 'success',
            message: 'Artwork added to gallery',
            gallery: gallery
        });
    } catch (error) {
        console.error('Error adding artwork to gallery:', error);
        res.status(500).json({
            error: 'Failed to add artwork',
            details: error.message
        });
    }
});

// Get artworks in a gallery
app.get('/api/galleries/:galleryId/artworks', isAuthenticated, async (req, res) => {
    try {
        const { galleryId } = req.params;
        const user = req.user;

        // Verify gallery belongs to user
        if (!user.galleries.includes(galleryId)) {
            return res.status(403).json({
                error: 'Unauthorized',
                details: 'This gallery does not belong to you'
            });
        }

        const gallery = await Schemas.Gallery.findById(galleryId);

        res.json({
            status: 'success',
            artworks: gallery.artworks
        });
    } catch (error) {
        console.error('Error fetching gallery artworks:', error);
        res.status(500).json({
            error: 'Failed to fetch artworks',
            details: error.message
        });
    }
});

app.delete('/api/galleries/:galleryId/artworks/:imageId', isAuthenticated, async (req, res) => {
    try {
        const { galleryId, imageId } = req.params;
    

        await Schemas.Gallery.updateOne({ _id: galleryId }, { $pull: { artworks: {image_id: imageId}}});

        res.json({
            status: 'success',
            message: 'Artwork removed from gallery',
        });
    }
    catch(error) {
         console.error('Error removing artwork from gallery: ', error);
         res.status(500).json({
            error: 'Failed to delete artwork',
            details: error.message
         })
    }
});