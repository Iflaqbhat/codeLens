const express=require('express');
const app=express();
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const port=3000;
app.use(express.json());
const users=[];
const todos=[];
const jwtSecret='secretkey';

app.post('/signup', async(req,res)=>{
    const{name,email,password}=req.body;
    if(!name || !email || !password){
        return res.status(400).json({message:"All fields are required"});
    }
    const userexists= users.find(user=>user.email===email);
    if(userexists){
        return res.status(400).json({message:"User already exists"});
    }
    const hashedPassword= await bcrypt.hash(password,10);
    const user={name,email,password:hashedPassword};
    users.push(user);
    //send token
    const token=jwt.sign({email},jwtSecret,{expiresIn:'1h'});
    res.status(201).json({message:"User created successfully",token});
})

app.post('/login',async(req,res)=>{
    const{email,password}=req.body;
    if(!email || !password){
        return res.status(400).json({message:"All fields are required"});
    }
    const user=users.find(user=>user.email===email);
    if(!user){
        return res.status(400).json({message:"User does not exist"});
    }
    const isPasswordValid= await bcrypt.compare(password,user.password);
    if(!isPasswordValid){
        return res.status(400).json({message:"Invalid password"});
    }

    //send token
    const token=jwt.sign({email},jwtSecret,{expiresIn:'1h'});
    res.status(200).json({message:"Login successful",token});
})

function authenticateToken(req,res,next){
    const authHeader=req.headers['authorization'];
    const token=authHeader && authHeader.split(' ')[1];
    if(!token){
        return res.status(401).json({message:"Token not found"});
    }
    jwt.verify(token,jwtSecret,(err,user)=>{
        if(err){
            return res.status(403).json({message:"Invalid token"});
        }
        req.user=user;
        next();
    })
}

app.post('/todos',authenticateToken,(req,res)=>{
    const{title,description}=req.body;
    if(!title || !description){
        return res.status(400).json({message:"All fields are required"});
    }
    const todo={title,description,email:req.user.email};
    todos.push(todo);
    res.status(201).json({message:"Todo created successfully",todo});
})

app.get('/todos',authenticateToken,(req,res)=>{         
    const userTodos=todos.filter(todo=>todo.email===req.user.email);
    res.status(200).json({todos:userTodos});
})

app.listen(port,()=>{
    console.log(`Server running on port ${port}`);
})
//is it good?