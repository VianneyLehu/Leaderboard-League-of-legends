

const express = require("express")

const axios = require('axios');

const bodyParser = require("body-parser")

const fs = require('fs')


const app = express()

const port = 3000

const API_Summoner = "https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/"

const API_Stats = "https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/"

//const Summoner1 = "AD1896"

const API_Key = "?api_key="

const Key = "RGAPI-e0caf4bc-d1e8-4964-8aef-218ae9b730fb"


//declare variable for summoners data




app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.static(__dirname + '/front'))

//app.use(express.json()); // Middleware pour traiter les données JSON

//form pour le summoner
app.get("/", (req, res) => {

    res.redirect('/index.html')   
    //res.send("Hello World!");
});

app.get("/register", (req, res) =>{
    res.sendFile(__dirname + '/front/register.html')
})

//recupere le summoner name
app.post('/getsummoner', (req, res) => {
    const summoner = req.body.summoner
    console.log(`Summoner name : ${summoner}`)

    res.redirect(`/summoner?summoner=${encodeURIComponent(summoner)}`)

});


//api request to riot with the summoner name
app.get("/summoner", async(req, res) => {


    const SummonerName = req.query.summoner

    console.log(`${SummonerName}`)

    try{

        console.log(API_Summoner + SummonerName + API_Key + Key)

        const response = await axios.get(API_Summoner + SummonerName + API_Key + Key)

        //res.json(response.data)

        //data

        const puuid = response.data["puuid"]

        const id = response.data["id"]

        const accountId = response.data["accountId"]

        const name = response.data["name"]

        const profilIconId = response.data["profileIconId"]

        const summonerLevel = response.data["summonerLevel"]


        const Data = {
            name:name,
            puuid:puuid,
            id:id,
            accountId:accountId,   
        }


        console.log(Data)


        let existingData = []

        try {
            const fileContents = fs.readFileSync('puuid.json', 'utf8');
            existingData = JSON.parse(fileContents);
            let isExisting = false
            for(data of existingData){
                      
                if(Data.id == data.id){
                    isExisting = true
                }        
            }

            if(isExisting == false){
                existingData.push(Data)
            }
        } catch (err) {
            console.log(err)
        }
        fs.writeFile('puuid.json', JSON.stringify(existingData, null, 2), err => {
            if (err) {
                console.error('Error saving data:', err);
            } else {
                console.log('Data has been saved to data.json');
            }
        });

        // Construct the URL with query parameters
        const queryParams = `?profilIconId=${encodeURIComponent(profilIconId)}&summonerLevel=${encodeURIComponent(summonerLevel)}&name=${encodeURIComponent(name)}`;
        const redirectUrl = `/summoner.html${queryParams}`;

        res.redirect(redirectUrl)


    }
    catch(error){

        res.status(500).json({ error: 'Une erreur est survenue lors de la requête à l\'API' });

    }

});



app.get("/leaderboard", (req, res) => {

    res.sendFile(__dirname + "/front/index.html")

});


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

app.post("/leaderboard", async(req,res)=>{


    
    const fetchData = []

    try {
        const data = await fs.promises.readFile('puuid.json', 'utf8');
        const leaderboardData = JSON.parse(data);

        console.log(leaderboardData)

        async function apiReq(account) {
            try {

                console.log("ACCOUNT ID :", account.id)
                let response = await axios.get(API_Stats + account.id + API_Key + Key);
                let tier = response.data[0]["tier"];
                let rank = response.data[0]["rank"];
                let lp = response.data[0]["leaguePoints"];
                let wins = response.data[0]["wins"];
                let losses = response.data[0]["losses"];

                fetchData.push({
                    name: account.name,
                    tier,
                    rank,
                    lp,
                    wins,
                    losses
                })

                console.log(response)


            } catch (error) {
                res.status(500).json({ error: 'Une erreur est survenue lors de la requête à l\'API' });
            }
        }

        for(const account of leaderboardData){
            await apiReq(account);
            await sleep(1000)


        }



        res.send(fetchData)



    } catch (err) {
        console.error('Error reading file:', err);
        res.status(500).json({ error: 'Une erreur est survenue lors de la lecture du fichier' });
    }




})

app.listen(port, () => {
    console.log(`Application exemple à l'écoute sur le port ${port}!`);
});

