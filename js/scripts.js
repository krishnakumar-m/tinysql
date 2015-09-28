var listRegExp = /\(.*\)\s*?/g;
var createBeginRegExp = /^CREATE\s+/i;
var tableBeginRegExp = /^TABLE\s+/i;

var insertBeginRegExp = /^INSERT\s+/i;
var intoBeginRegExp = /^INTO\s+/i;

var Tables = 
{ employee:
    {
	rows : [
	    {
		empid:100,
		ename:"Abraham"
	    },
	    {
		empid:101,
		ename:"Brian"
	    }
	],
	cols : 
	{
	    ename:{type:"string",defaultValue :null},
	    empid:{type:"number",nullable:false}
	}   
    }
}
    ;
var TableCount=0;
var Result = {
    table:"emp",
    rows : [
	{
	    "empid":100,
	    "name":"Abraham"
	},
	{
	    "empid":101,
	    "name":"Brian"
	}
    ],
    colNames:["empid","ename"]
};

function runQuery() {
    /* try
     {*/
    var sql = document.getElementById("sql").value;
    parseQuery(sql);
    Result.rows = Tables["employee"].rows;
    displayResults();
    /*  } catch(e) {
     document.getElementById("results").innerText = e.toString();
     }*/
    // Result = evalTree(parseTree);
    // 
}

function insertQueryParser(query) {
    var lists =[], cols = [], tableName ="", tgtTable = {},i;
    var fieldsSpecified = false, tableNameSeparator = "";
    query = query.replace(insertBeginRegExp, "");
    if (0 === query.search(intoBeginRegExp))
    {
	query = query.replace(intoBeginRegExp, "");

	if (query.search(/\)\s*values\s*\(/i) > -1)
	{

	    tableNameSeparator =  query.indexOf("\(");

	    fieldsSpecified = true;

	}
	else if (query.search(/\s*values\s*\(/i) > -1)
	{
	    tableNameSeparator = query.indexOf(" ");

	}
	else
	{
	    throw Error("Empty insert statement");
	}

	tableName = query.substring(0, tableNameSeparator).trim();

	tgtTable = Tables[tableName];

	if (!tgtTable)
	{
	    throw Error("Table does not exist");
	}

	if (fieldsSpecified)
	{
	    cols = query.substring(query.indexOf("(") + 1, query.indexOf(")")).split(",");
	    for(i in cols) {
		if (!tgtTable.cols[cols[i]])
		{
		    throw Error("Unknown column in column list");
		}
		cols[i] = cols[i].trim();
	    }



	}
	else
	{
	    for(i in tgtTable.cols) {
		cols.push(i);
	    }
	}


	vals = query.replace(/.*values\s*\(/i, "").replace(/\)\s*;/, "").split(",");
	if (vals.length !== cols.length)
	{
	    throw Error("Inadequate number of values");
	}


	row = {};


	for(i in tgtTable.cols) {

	    colIndx = cols.indexOf(i);
	    colRef = tgtTable.cols[i];

	    if (colIndx > -1) // Table column is in Column list
	    {
		alert(i);
		alert(colIndx);
		alert(vals);
		vals[colIndx] = vals[colIndx].trim();

		if (colRef.type == "string" && vals[colIndx].match(/^\'.*\'$/))
		{
		    value = vals[colIndx].replace(/\'/g, "");
		}
		else if (colRef.type == "number" && vals[colIndx].match(/[0-9]+/))
		{
		    value = vals[colIndx];
		}
		else
		{
		    throw Error("Datatype mismatch");
		}


	    }
	    else
	    {
	        if (colRef.defaultValue)
		{
		    value = colRef.defaultValue;
		}
		else
		{
		    if (!colRef.nullable)
		    {
			throw Error("Field should not be null");
		    }
		}

	    }

	    row[i] = value;

	}

	tgtTable.rows.push(row);
    }
    else
    {
	throw Error("Expected token INTO");
    }
}

function createQueryParser(query) {
    var str,patt,fields,fld,i,tableName;
    query = query.replace(createBeginRegExp, "");
    if (0 === query.search(tableBeginRegExp))
    {

	query = query.replace(tableBeginRegExp, "");
	patt = new RegExp(listRegExp);
	str = patt.exec(query)[0];

	// Remove ( and );
	str = str.replace(/\(\s*/, "");
	str = str.replace(/\)\s*/, "");

	//Remove fields from create statement
	// remaining string is table name
	tableName = query.replace(listRegExp, "").trim();


	if ("" === tableName)
	{
	    throw Error("Table name expected");
	}


	tableName = tableName.toUpperCase().trim().replace(";", "");

	if (Tables[tableName])
	{
	    throw Error("Table already exists");
	}

	table = {};
        table["cols"] = {};
	// Split fields by comma
	fields = str.split(",");

	// Parse each field
	for (i = 0;i < fields.length;i++)
	{

	    fields[i] = fields[i].trim();

	    fld = fields[i].split(/\s+/);

	    if (fld.length >= 2)
	    {
		//table.cols[i].name = fld[0].toUpperCase();
		column =  fld[0].toUpperCase();
		//table.cols[column] = {};

		if (0 === fld[1].search(/VARCHAR/i))
		{
		    table.cols[column] = {type:"string"};
		    // to do populate len field
		}
		else if (0 === fld[1].search(/INT/i))
		{
		    table.cols[column] = {type:"number"};
		}
		else
		{
		    throw Error("Unknown datatype " + fld[1]);
		}
	    }
	    else
	    {
		throw Error("Datatype is missing for " + fld);
	    }


	}
	Tables[tableName] = table;
    }
    else
    {
	throw Error("Expected token TABLE");
    }
}
function parseQuery(query) {

    query = query.replace("\n", " ").trim();

    if (0 === query.search(createBeginRegExp))
    {
	createQueryParser(query);
    }
    else if (0 === query.search(insertBeginRegExp))
    {
	insertQueryParser(query);
    }
    else
    {
	throw Error("Unknown command");
    }


}


function getPreced(op) {
    switch (op)
    {
	case "(": 
	case ")": return 15;
	case "/":
	case "*":
	case "%": return 9;
	case "+": 
	case "-": return 8;
	case ">":
	case "<":
	case "<=" :
	case ">=" :
	case "=":
        case "<>" : return 7;
	case "NOT" : return 6;
	case "AND" : 
	case "OR" : return 5;
	default : return 0;
    }
}



function evaluateExp (str) {

    var tokens = tokenize(str);
    tokens = buildRPN(tokens);
    str = "";
    for(i in tokens) 
	str += tokens[i].value;
    
    var result = evalRPN(tokens);
    return result;
    
}

function printObj(o) {
    var arr =[];
    for(prop in o) {
	arr.push(prop + ":" + o[prop]);
    }
    return "{" + arr.join(",") + "}";
}

function compute(a,b,op) {
   var t = a.type;
   var val1=a.value, val2=b.value;
   
   alert(op.value+" "+val1+" "+val2+" ");
    
    switch(op.value) {
	case "+": return {type:t,value:val1+val2};
	case "-": return {type:t,value:val1-val2};
	case "*": return {type:t,value:val1*val2};
	case "/": return {type:t,value:val1/val2};
	case ">": return {type:t,value:val1>val2};
	case "<": return {type:t,value:val1<val2};
	case ">=": return {type:t,value:val1>=val2};
	case "<=": return {type:t,value:val1<=val2};
	case "=": return {type:t,value:val1==val2};
	case "AND": return {type:t,value:val1&&val2};
	case "OR": return {type:t,value:val1||val2};
	case "NOT": return {type:t,value:!val1};
    }
}

function evalRPN(tokens) {
    var token,stk =[],op1,op2;
    while(tokens.length>0) {
	token = tokens.shift();
	
	if (token.type == "STR" || token.type == "NUM" || token.type == "ID") {
	    stk.push(token);
	} else if(token.type=="OP") {
	    op2 = stk.pop();
	    op1 = stk.pop();
	    stk.push(compute(op1,op2,token));
	}
	
	
    }
    
    if(stk.length!=1) {
	throw Error("Eval Syntax error");
    }
    
    return stk.pop();
}


function buildRPN(tokens) {
    var rpn =[], opstack=[],token;
    while (tokens.length > 0)
    {

	token = tokens.shift();

	if (token.type == "STR" || token.type == "NUM" || token.type == "ID")
	{
	    rpn.push(token);

	}
	else if (token.type == "OP")
	{

	    if (opstack.length == 0 || opstack[opstack.length - 1].value == "(")
	    {
		opstack.push(token);

	    }
	    else
	    {
		if (token.value == ")")
		{

		    do {
			optoken = opstack.pop();
			rpn.push(optoken);

		    }while(optoken.value != "(" && opstack.length > 0);
		    rpn.pop();
		}
		else if (token.value == "(")
		{

		    opstack.push(token);

		}
		else
		{
		    
		    
		    while (opstack.length>0 && getPreced(opstack[opstack.length - 1].value) >= getPreced(token.value))
		    {

			rpn.push(opstack.pop());
		    }

		    opstack.push(token);
		}
	    }
	}

    }

    while (opstack.length > 0)
    {
	rpn.push(opstack.pop());
    }

    return rpn;
}


function tokenize(str) {
    var tokens = [], token = {},i=0;
    var OpsList = ["+","-","*","/","%","(",")",">=","<=","<>"];
    var Keywords = ["AND","OR", "NOT", "IN","BETWEEN"];
    str = str.replace("\r\n", " ");//.replace(/\s+/, " ");
    token["type"] = "";
    token["value"] = "";
    var tempString = "";
    while (i < str.length && str[i])
    {
	tempString = "";

	// Skip all white spaces
	while (/[\s\t\r\n]/.test(str[i])) i++;

	if (/[0-9]/.test(str[i]))
	{
	    do {
		tempString += str[i];i++;
	    }while(/[0-9\.]/.test(str[i]));

	    tokens.push({type : "NUM",value:parseFloat(tempString)});

	}

	else if (/[a-zA-Z_]/.test(str[i]))
	{
	    do {
		tempString += str[i];i++;
	    }while(/[0-9a-zA-Z_]/.test(str[i]));

	    if (Keywords.indexOf(tempString.toUpperCase()) > -1)
	    {
		tokens.push({type : "OP",value:tempString.toUpperCase()});
	    }
	    else
	    {

		tokens.push({type : "ID",value:tempString});
	    }

	}

        else if (/'/.test(str[i]))
	{
	    i++;
	    while (str[i] && str[i] != "'")
	    {

		tempString += str[i];
		i++;
	    }
	    i++;
	    tokens.push({type : "STR",value:tempString});
	}

	else if ("+-*/%><=(),".indexOf(str[i]) > -1)
	{

	    tempString = str[i];
	    i++;
	    if (str[i])
	    {
		if ((tempString == "<" && str[i] == "=")
		    || (tempString == ">" && str[i] == "=")
		    || (tempString == "<" && str[i] == ">"))
		{
		    tempString += str[i];
		    i++;
		}
	    }

	    tokens.push({type : "OP",value:tempString});
	}

	else
	{
	    throw Error("Character unrecognised");
	}


    }

    return tokens;

}

function displayResults() {
    var resDiv = document.getElementById("results");
    var i,tr,td;
    var tab = document.createElement("table");
    tab.setAttribute("border", "1");
    var cap = document.createElement("caption");
    cap.innerText = "Table name :" + Result.table;
    tab.appendChild(cap);
    tr = document.createElement("tr");
    for(i in Result.colNames) {
	td = document.createElement("th");
	td.innerText = Result.colNames[i];
	tr.appendChild(td);
    }
    tab.appendChild(tr);
    for(i in Result.rows) {

	row = Result.rows[i];
	tr = document.createElement("tr");
	for(j in Result.colNames) {
	    col = Result.colNames[j];
	    td = document.createElement("td");
	    td.innerText = row[col];
	    tr.appendChild(td);
	}
	tab.appendChild(tr);
    }
    resDiv.appendChild(tab);
}


