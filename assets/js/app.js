
var genedatatable;
//number of subjects to plot, 3 means dealing with trio, etc.
var numSamples=3;
//dataset[0]=placeholder value for scatterplot xaxis; dataset[1]=min coverage for gene of individual
var dataset = [];
//counter to keep track of dataset[0]
var geneCounter=1;

//apply min coverage filter to gene table
function applyClick(){
  var minFilter = document.getElementById("minCoverageField").value;

  if(minFilter!=""){
    var data = genedatatable.rows().data();

    data.each(function (value, index) {
      var minCoverage=value[3];

      if(minCoverage<minFilter){
        var newData = [value[0],value[1],value[2],value[3],"FAIL"];
      }
      else{
        var newData = [value[0],value[1],value[2],value[3],"PASS"];
      }
      data.row( index ).data( newData ).draw();
    });
  }
}

//clear pass/fail status from gene table
function clearClick(){
  var data = genedatatable.rows().data();

  data.each(function (value, index) {
    var newData = [value[0],value[1],value[2],value[3],"-"];
    data.row( index ).data( newData ).draw();
  });
}

//add new gene to gene table
function updateGeneTable(genedatatable,currGene){
  genedatatable.row.add([currGene["proband"].gene, currGene["proband"].mean,
    currGene["proband"].sd, currGene["proband"].min]).draw();
}

//var atestContainer = [];
//parse gene data from individual and send data to geneContainer object
var fileCounter=0;
function parseSubjectData(file,subjectData,subjectType){
  d3.tsv(file, function(data) {
    fileCounter++;
    geneCounter=1;
    data.forEach(function(d) {
        subjectData.addData(d,subjectType);
        d["xaxis"]=geneCounter;
        d["subjectType"]=subjectType
        //dataset.push([geneCounter,parseInt(d.min),d]);
      //  atestContainer.push(d);
        geneCounter++;
      });
    if(fileCounter==numSamples){
      //trioArray - each row contains all subject's data for one gene
      var trioArray=[];
      for(gene in subjectData.geneDict){
        var trio = subjectData.geneDict[gene];
        trioArray.push(trio);
      }
      //order trioArray based on proband's min
      trioArray.sort(function(a,b){
        return a["proband"]["min"]-b["proband"]["min"];
      })
      var rowCounter=0;
      //push gene info for each individual to separate row in dataset
      trioArray.forEach(function(trio){
        rowCounter++;
        dataset.push([rowCounter,trio.proband.min,trio.proband]);
        dataset.push([rowCounter,trio.mom.min,trio.mom]);
        dataset.push([rowCounter,trio.dad.min,trio.dad]);
      })
      drawplot();
    }
  });
}

//object to hold parsed gene data from different individuals
function geneContainer(){
  //object like python dictionary
  this.geneDict={};
  //drawplot();

  //add data to geneDict
  this.addData = function(d,subjectType){
    //there's already an key for this gene in the dictionary, add this min to value of key-val pair
    if(d.gene in this.geneDict){
      var tempVal = this.geneDict[d.gene];
      tempVal[subjectType]=d;
      this.geneDict[d.gene]=tempVal;

      var sizeArray = parseInt(Object.keys(tempVal).length);

      //we have gene data from all subjects, so need to drawn on scatterplot
      if(sizeArray==numSamples){
        //send gene to table
        updateGeneTable(genedatatable,this.geneDict[d.gene]);
      }
    }
    //create key for gene in dictionary
    else{
      var tempInitVal = [];
      tempInitVal[subjectType]=d;
      this.geneDict[d.gene]=tempInitVal;
    }
  };
}

function drawplot(){
  //Width and height
  var w = 1300;
  var h = 500;
  var padding = 30;

  //Create scale functions
  var xScale = d3.scale.linear()
             .domain([0, d3.max(dataset, function(d) { return d[0]; })])
             .range([padding, w - padding * 2]);

  var yScale = d3.scale.linear()
             .domain([0, d3.max(dataset, function(d) { return d[1]; })])
             .range([h - padding, padding]);

  var rScale = d3.scale.linear()
             .domain([0, d3.max(dataset, function(d) { return d[1]; })])
             .range([2, 5]);

  //Define X axis
  var xAxis = d3.svg.axis()
            .scale(xScale)
            .orient("bottom")
            .ticks(5);

  //Define Y axis
  var yAxis = d3.svg.axis()
            .scale(yScale)
            .orient("left")
            .ticks(5);

  //.data([0]) will only create one svg
  var svg = d3.select("#scatterplot-div").selectAll("svg").data([0]);

  // Define the div for the tooltip
  var div = d3.select("#scatterplot-div").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);


  //Create SVG element
  svg.enter()
        .append("svg")
        .attr("width", w)
        .attr("height", h);

  //Create circles
  svg.selectAll("circle")
     .data(dataset)
     .enter()
     .append("circle")
     .attr("cx", function(d) {
        return xScale(d[0]);
     })
     .attr("cy", function(d) {
        return yScale(d[1]);
     })
     .attr("r", function(d) {
        return 3.5;
     })
     .attr("class", function(d){
       return d[2]["subjectType"];
     })
     .on("mouseover", function(d) {
          div.transition()
               .duration(200)
               .style("opacity", .9);
          div.html("GENE: "+d[2]["gene"]+"<br/>"+
                "Subject: "+d[2]["subjectType"]+"<br/>"+
                "Min: "+d[2]["min"]+"<br/>"+
                "Mean: "+d[2]["mean"]+"<br/>"+
                "Max: "+d[2]["max"]+"<br/>"+
                "SD: "+d[2]["sd"]+"<br/>")
               .style("left", (d3.event.pageX + 5) + "px")
               .style("top", (d3.event.pageY - 28) + "px");
      })
      .on("mouseout", function(d) {
          div.transition()
               .duration(500)
               .style("opacity", 0);
      });


  var axisEnter = svg.selectAll("g.x.axis").data([0]).enter().append('g')
    axisEnter.attr("class", "x axis")
    .attr("transform", "translate(0," + (h - padding) + ")")
    .call(xAxis);

  //Create Y axis
  svg.append("g")
    .attr("class", "y axis")
    .attr("transform", "translate(" + padding + ",0)")
    .call(yAxis);
}

$(document).ready(function() {
      //initialize DataTables table
      genedatatable = $('#gene-table-div').DataTable( {
        "scrollY":        "300px",
        "scrollCollapse": true,
        "paging":         false,
        "columnDefs": [{
            "defaultContent": "-",
            "targets": "_all"
          }],
        columns: [
            { title: "GENE" },
            { title: "MEAN" },
            { title: "SD" },
            { title: "MIN" },
            { title: "STATUS" },
        ]
      });

      var subjectData = new geneContainer();

      var probandFile="file:///Users/ryan/Dropbox/Marth_rotation/coverage.iobio/assets/data/15-0027099.txt";
      parseSubjectData(probandFile,subjectData,"proband");

      var parentOneFile="file:///Users/ryan/Dropbox/Marth_rotation/coverage.iobio/assets/data/15-0027100.txt";
      parseSubjectData(parentOneFile,subjectData,"mom");

      var parentTwoFile="file:///Users/ryan/Dropbox/Marth_rotation/coverage.iobio/assets/data/15-0027101.txt";
      parseSubjectData(parentTwoFile,subjectData,"dad");

});
