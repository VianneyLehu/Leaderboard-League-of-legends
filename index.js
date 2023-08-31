

const express = require("express")

const axios = require('axios');

const bodyParser = require("body-parser")

const fs = require('fs')


const app = express()

const port = 3000

const API_Summoner = "https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/"

const API_Stats = "https://euw1.api.riotgames.com/lol/league/v4/entries/by-summoner/"

const API_Profil = "https://europe.api.riotgames.com/lol/match/v5/matches/by-puuid/"

const API_Matches = "https://europe.api.riotgames.com/lol/match/v5/matches/"

const params = "/ids?start=0&count=10&"

const API_Key2 = "api_key="

const API_Key = "?api_key="

const Key = "RGAPI-e80623d1-0061-46f9-8d9c-e193fa0b0289"


//declare variable for summoners data




app.use(bodyParser.urlencoded({ extended: true }))

app.use(express.json())


app.use(express.static(__dirname + '/front'))

//app.use(express.json()); // Middleware pour traiter les données JSON


//functions 


function compareSummoners(summoner1, summoner2){

    const TierOrder = ["Challenger", "Grandmaster", "Master", "Diamond", "Platinum", "Gold", "Silver", "Bronze", "Iron"]

    const romanToNumber = {
        I: 1, II: 2, III: 3, IV: 4
    }

    const TierComparaison = TierOrder.indexOf(summoner1.rank) - TierOrder.indexOf(summoner2.rank)

    if(TierComparaison !== 0){
        return TierComparaison
    }
   
    
    const rankComparison = romanToNumber[summoner1.rank] - romanToNumber[summoner2.rank]
    if (rankComparison !== 0) {
        return rankComparison
    }


    
    const lpComparison = parseInt(summoner1.LP) - parseInt(summoner2.LP)

    return lpComparison
    


}

async function apiReq(account, fetchData) {
    try {

        let response = await axios.get(API_Stats + account.id + API_Key + Key);
        let tier = response.data[0]["tier"];
        let rank = response.data[0]["rank"];
        let lp = response.data[0]["leaguePoints"];
        let wins = response.data[0]["wins"];
        let losses = response.data[0]["losses"];


        console.log("tier: ", tier)
        console.log("\n rank:", rank)

        const winrate = (wins/(wins + losses))*100


        if(rank != undefined){
        
            fetchData.push({
            name: account.name,
            tier,
            rank,
            lp,
            wins,
            losses,
            winrate

            })

        } 

    } catch (error) {
        console.log(error)
    }
}


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}




async function apiProfil(matches, matchesData) {
    try {

        const response = await axios.get(API_Matches + matches + API_Key + Key);


        const participantsData = response.data.info.participants

        const extractedParticipants = [];

        for (const participant of participantsData) {
            const {
                summonerName,
                championName,
                kills,
                deaths,
                assists,
                item0,
                item1,
                item2,
                item3,
                item4,
                item5,
                item6,
                summoner1Id,
                summoner2Id,
                lane
            } = participant;

            const participantInfo = {
                username: summonerName,
                champion: championName,
                kills,
                deaths,
                assists,
                item0,
                item1,
                item2,
                item3,
                item4,
                item5,
                item6,
                summoner1Id,
                summoner2Id,
                lane
            };


            extractedParticipants.push(participantInfo);

        }

        matchesData.push(extractedParticipants);
     

    } catch (error) {
        console.log(error)
    }
}


//form pour le summoner
app.get("/", (req, res) => {

    res.redirect('/index.html')   
    //res.send("Hello World!");
});

app.get("/register", (req, res) =>{
    res.sendFile(__dirname + '/front/register.html')
})


//api request to riot with the summoner name
app.post("/summoner", async(req, res) => {


    const summonerName = req.body.summoner

    console.log(summonerName)

    try{

        console.log(API_Summoner + summonerName + API_Key + Key)

        const response = await axios.get(API_Summoner + summonerName + API_Key + Key)

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
            for(const data of existingData){
                      
                if(Data.id == data.id && existingData != null){
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

        res.redirect("/leaderboard")


    }
    catch(error){

        res.status(500).json({ error: 'Une erreur est survenue lors de la requête à l\'API' });

    }

});




app.get("/leaderboard", (req, res) => {

    res.sendFile(__dirname + "/front/index.html")

});




app.post("/leaderboard", async(req,res)=>{


    
    const fetchData = []

    try {
        const data = await fs.promises.readFile('puuid.json', 'utf8');
        const leaderboardData = JSON.parse(data);
       
        for(const account of leaderboardData){
            await apiReq(account, fetchData);
            await sleep(1000)
        }

        fetchData.sort(compareSummoners);

        res.send(fetchData)



    } catch (err) {
        console.error('Error reading file:', err);
        res.status(500).json({ error: 'Une erreur est survenue lors de la lecture du fichier' });
    }




})



app.get("/profil/:username", (req, res) => {
    const username = req.params.username;
    res.sendFile(__dirname + "/front/profil.html", { username: username })
});




app.post("/profil", async(req, res) => {

    try{
        const username = req.body.username

        console.log("username: ", username)

        const matchesData = []

        const list_Id_Matches = []



        let puuid = ""


        const data = await fs.promises.readFile('puuid.json', 'utf8');
        const leaderboardData = JSON.parse(data);

        for(const account of leaderboardData){


            if(account.name == username){
                console.log("   ceci est uin tAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAST")
                puuid = account.puuid
            }
        }


        const response = await axios.get(API_Profil + puuid + params + API_Key2 + Key)



        list_Id_Matches.push(response.data)


        for(const matches of list_Id_Matches[0]){

            await apiProfil(matches, matchesData);
        }


        console.log(matchesData)


        res.send(matchesData)
    

    }catch (error) {
        console.error('Error:', error);
        res.status(500).json({ message: 'An error occurred' });

    }



})


app.listen(port, () => {
    console.log(`Application exemple à l'écoute sur le port ${port}!`);
});

