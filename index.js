var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var path = require("path");

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect('mongodb+srv://umapavan:Uma%404530@cluster0.q8lac93.mongodb.net/userdetails', { useNewUrlParser: true, useUnifiedTopology: true });

var db = mongoose.connection;
db.on('error', () => console.log('Error in connection to database'));
db.once('open', () => console.log('Connected to database'));

var userSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String
});

var User = mongoose.model('logincredentials', userSchema);

app.post("/signup", async (req, res) => {
    var name = req.body.name;
    var email = req.body.email;
    var password = req.body.password;

    var newUser = new User({
        name: name,
        email: email,
        password: password
    });

    try {
        var user = await User.findOne({ name: name});
        if(user){
            return res.redirect('/login?error=exists'); 
        }
        await newUser.save();
        console.log("Record inserted successfully");
        var userCollectionName = name.replace(/\s+/g, '').toLowerCase();
        var userCollection = db.collection(userCollectionName);

        var initialDocument = {
            name: name,
            date: new Date(),
            email: email,
            password: password,
            Balance: 0,
            Income: 0,
            Expenditure: 0,
            history: []
        };

        await userCollection.insertOne(initialDocument);

        console.log(`Collection ${userCollectionName} created successfully with initial document`);
        return res.redirect('/login?error=welcome');
    } catch (err) {
        console.error("Error inserting record:", err);
        res.send("Error during signup");
    }
});
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
  });
app.post("/login", async (req, res) => {
    var name = req.body.name;
    var password = req.body.password;

    try {
        var user = await User.findOne({ name: name, password: password });
        if (user) {
            var userCollectionName = user.name.replace(/\s+/g, '').toLowerCase();
            var userCollection = db.collection(userCollectionName);
            var userData = await userCollection.findOne({ name: name });
            res.render('home', { userData: userData ,insufficientBalance:false });
        } else {
            return res.redirect('/login?error=Invalid credentials');
        }
    } catch (err) {
        console.error("Error finding user:", err);
        res.send("Error during login");
    }
});

app.post("/income", async (req, res) => {
    var name = req.body.name;
    var type = 'Income';
    var type_of_source = req.body.incomeType;
    var description = req.body.incomeDescription;
    var amount = parseFloat(req.body.incomeAmount);

    var history_item = {
        type: type,
        type_of_source: type_of_source,
        description: description,
        amount: amount,
        date: new Date()
    };

    try {
        var userCollectionName = name.replace(/\s+/g, '').toLowerCase();
        var userCollection = db.collection(userCollectionName);
        await userCollection.updateOne(
            { name: name },
            {
                $push: { history: history_item },
                $inc: { Balance: amount, Income: amount }
            }
        );
        var userData = await userCollection.findOne({ name: name });
        res.render('home', { userData: userData,insufficientBalance: false });
    } catch (err) {
        console.error("Error updating income:", err);
        res.send("Error adding income");
    }
});

app.post("/expenditure", async (req, res) => {
    var name = req.body.name;
    var type = 'Expenditure';
    var type_of_source = req.body.expenditureType;
    var description = req.body.expenditureDescription;
    var amount = parseFloat(req.body.expenditureAmount);
    var history_item = {
        type: type,
        type_of_source: type_of_source,
        description: description,
        amount: amount,
        date: new Date()
    };

    try {
        var userCollectionName = name.replace(/\s+/g, '').toLowerCase();
        var userCollection = db.collection(userCollectionName);
        var userData = await userCollection.findOne({ name: name });
        if((userData.Balance-amount) < 0){
            res.render('home', { userData: userData, insufficientBalance: true}, );
            return;
        }else{
        await userCollection.updateOne(
            { name: name },
            {
                $push: { history: history_item },
                $inc: { Balance: -amount, Expenditure: amount }
            }
        );
        var userData = await userCollection.findOne({ name: name });
        res.render('home', { userData: userData , insufficientBalance: false});}
    } catch (err) {
        console.error("Error updating expenditure:", err);
        res.send("Error adding expenditure");
    }
});

app.post("/delete", async (req, res) => {
    var { name, date } = req.body;

    try {
        var userCollectionName = name.replace(/\s+/g, '').toLowerCase();
        var userCollection = db.collection(userCollectionName);
        
        await userCollection.updateOne(
            { name: name },
            {
                $pull: { history: { date: date } }
            }
        );

        var userData = await userCollection.findOne({ name: name });
        console.log("successfully deleted");
        res.json({ success: true, userData: userData });
    } catch (err) {
        console.error("Error deleting history item:", err);
        res.status(500).json({ success: false, error: "Error deleting history item" });
    }
});


app.get("/income/history", async (req, res) => {
    var name = req.query.name;

    try {
        var userCollectionName = name.replace(/\s+/g, '').toLowerCase();
        var userCollection = db.collection(userCollectionName);
        var user = await userCollection.findOne({ name: name }, { projection: { history: 1 } });

        if (user && user.history) {
            var incomeHistory = user.history.filter(item => item.type === 'Income');
            res.json(incomeHistory);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error("Error fetching income history:", err);
        res.status(500).send("Error fetching income history");
    }
});
app.get("/expenditure/history", async (req, res) => {
    var name = req.query.name;

    try {
        var userCollectionName = name.replace(/\s+/g, '').toLowerCase();
        var userCollection = db.collection(userCollectionName);
        var user = await userCollection.findOne({ name: name }, { projection: { history: 1 } });

        if (user && user.history) {
            var expenditureHistory = user.history.filter(item => item.type === 'Expenditure');
            res.json(expenditureHistory);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error("Error fetching expenditure history:", err);
        res.status(500).send("Error fetching expenditure history");
    }
});
app.get("/history", async (req, res) => {
    var name = req.query.name;

    try {
        var userCollectionName = name.replace(/\s+/g, '').toLowerCase();
        var userCollection = db.collection(userCollectionName);
        var user = await userCollection.findOne({ name: name }, { projection: { history: 1 } });

        if (user && user.history) {
            res.json(user.history);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error("Error fetching history:", err);
        res.status(500).send("Error fetching history");
    }
});
app.get("/logout",(req, res) => {
    res.redirect('/');
});
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get("/", (req, res) => {
    res.set({
        "Allow-access-Allow-origin": '*'
    });
    res.redirect('index.html');
});

app.listen(8080, () => {
    console.log("Listening to port 8080");
});
