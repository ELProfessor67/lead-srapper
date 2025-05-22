import express from "express";
import { searchGoogleMaps } from "./services/leadScrapService.js";
const app = express();


const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/get-leads", async (req, res) => {
    const leadCount = req.query.leadCount;
    const minReviews = req.query.minReviews;
    const query = req.query.query;
    const leads = await searchGoogleMaps(query, leadCount, minReviews);
    res.json(leads);
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});



app.listen(PORT,() => {
    console.log(`Server is running on port ${PORT}`);
})