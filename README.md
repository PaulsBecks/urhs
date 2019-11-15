# URHS Client

This is for everyone wanting to host their own service at home, on a raspi or any other machine, even your crappy old laptop will do.

You need one thing though, [Node JS](https://github.com/nodejs/node). We can get rid of this too, but for now you need it. 

## Here is what to do to host your server:

1. Clone the repo
```
git clone https://github.com/PaulsBecks/urhs
```

2. Start your server
```
cd urhs/ && npm run example  # replace this with your own 
```

3. Start URHS Client in another terminal
```
npm run start 9000  # or whatever port your local server is running on
```

Profit. 
