(function() {
  ////////////////////////////////////////////////////////////
  //// Initial Setup /////////////////////////////////////////
  ////////////////////////////////////////////////////////////
  const attributes = {
    age: { display: "Age", type: "numerical", unit: null },
    sex: {
      display: "Sex",
      type: "categorical",
      values: { "1": "Male", "0": "Female" }
    },
    cp: {
      display: "Chest pain type",
      type: "categorical",
      values: {
        "0": "Typical angina",
        "1": "Atypical angina",
        "2": "Non-anginal pain",
        "3": "Asymptomatic"
      }
    },
    trestbps: {
      display: "Resting blood pressure",
      type: "numerical",
      unit: "mm Hg"
    },
    chol: { display: "Serum cholestoral", type: "numerical", unit: "mg/dl" },
    fbs: {
      display: "Fasting blood sugar",
      type: "categorical",
      values: { "1": "> 120 mg/dl", "0": "<= 120 mg/dl" }
    },
    restecg: {
      display: "Resting electrocardiographic results",
      type: "categorical",
      values: {
        "0": "Normal",
        "1": "Having ST-T wave abnormality",
        "2":
          "Showing probable or definite left ventricular hypertrophy by Estes' criteria "
      }
    },
    thalach: {
      display: "Maximum heart rate achieved",
      type: "numerical",
      unit: "bpm"
    },
    exang: {
      display: "Exercise induced angina",
      type: "categorical",
      values: { "1": "Yes", "0": "No" }
    },
    oldpeak: {
      display: "ST depression induced by exercise relative to rest",
      type: "numerical",
      unit: null
    },
    slope: {
      display: "The slope of the peak exercise ST segment ",
      type: "categorical",
      values: { "0": "Upsloping", "1": "Flat", "2": "Downsloping" }
    },
    ca: {
      display: "Number of major vessels colored by flourosopy",
      type: "numerical",
      unit: null
    },
    thal: {
      display: "Thallium stress test result",
      type: "categorical",
      values: {
        "1": "Normal",
        "2": "Fixed defect",
        "3": "Reversable defect"
      }
    },
    target: {
      display: "Diagnosis",
      type: "categorical",
      values: { "1": "Presence", "0": "Absence" }
    }
  };

  let filters = {
    categorical: {
      selected: "sex", // Keep track of selected categorical filter to update bubble chart
      values: Object.keys(attributes)
        .filter(attr => {
          return attributes[attr].type === "categorical";
        })
        .reduce((values, attr) => {
          values[attr] = null;
          return values;
        }, {})
    },
    numerical: {
      values: Object.keys(attributes)
        .filter(attr => {
          return attributes[attr].type === "numerical";
        })
        .reduce((values, attr) => {
          values[attr] = null;
          return values;
        }, {})
    }
  };

  let data;
  let highlightedPatient;
  let initialFilters;
  let bubbleChart, parallelCoordinates, donutChart, countSummary;
  let tooltip;
  let globalUpdate = {};

  globalUpdate.updateFilteredData = function(filters) {
    // Update each data point's filteredOut property
    const categoricalFilters = filters.categorical.values;
    const numericalFilters = filters.numerical.values;
    data.forEach(d => {
      d.filteredOut = !(
        Object.keys(categoricalFilters).every(attr => {
          return categoricalFilters[attr][d[attr]];
        }) &&
        Object.keys(numericalFilters).every(attr => {
          return (
            numericalFilters[attr].min <= d[attr] &&
            numericalFilters[attr].max >= d[attr]
          );
        })
      );
    });
    bubbleChart.updateFilteredData(data);
    parallelCoordinates.updateFilteredData(data);
    donutChart.updateFilteredData(data);
    countSummary.updateFilteredData(data);
  };

  globalUpdate.highlight = function(d) {
    highlightedPatient = d;
    bubbleChart.highlight(d);
    parallelCoordinates.highlight(d);
  };

  globalUpdate.unhighlight = function(d) {
    bubbleChart.unhighlight(d);
    parallelCoordinates.unhighlight(d);
    highlightedPatient = null;
  };

  d3.csv("heart.csv").then(csv => {
    processData(csv);

    // Reset all filters button
    d3.select("#reset-filters").on("click", () => {
      filters = JSON.parse(JSON.stringify(initialFilters));
      globalUpdate.updateFilteredData(filters);
      parallelCoordinates.resetFilters();
    });

    tooltip = renderTooltip();

    bubbleChart = renderBubbleChart(data, globalUpdate, tooltip);
    parallelCoordinates = renderParallelCoordinates(
      data,
      globalUpdate,
      tooltip
    );
    donutChart = renderDonutChart(data, globalUpdate);
    countSummary = renderCountSummary(data, globalUpdate);
  });

  ////////////////////////////////////////////////////////////
  //// Data Processing ///////////////////////////////////////
  ////////////////////////////////////////////////////////////
  function processData(csv) {
    data = csv.map((d, i) => {
      d.id = "patient-" + i;
      d.filteredOut = false;
      csv.columns.forEach(col => {
        if (attributes[col].type === "numerical") {
          d[col] = +d[col];
        } else {
          d[col] = attributes[col].values[d[col]];
        }
      });
      return d;
    });
    // console.log(data);

    // Initialize filters to select everything
    // Categorical variables select all values
    const categoricalFilters = filters.categorical.values;
    Object.keys(categoricalFilters).forEach(attr => {
      const filter = {};
      Object.values(attributes[attr].values).forEach(value => {
        filter[value] = true;
      });
      categoricalFilters[attr] = filter;
    });

    // Numerical variables select form minimum to maximum
    const numericalFilters = filters.numerical.values;
    Object.keys(numericalFilters).forEach(attr => {
      const filter = {};
      filter.min = d3.min(data, d => d[attr]);
      filter.max = d3.max(data, d => d[attr]);
      numericalFilters[attr] = filter;
    });
    // console.log(filters);
    // Make a deep copy
    initialFilters = JSON.parse(JSON.stringify(filters));
  }

  ////////////////////////////////////////////////////////////
  //// Bubble Chart //////////////////////////////////////////
  ////////////////////////////////////////////////////////////
  // https://github.com/vlandham/bubble_chart_v4
  function renderBubbleChart(data, globalUpdate, tooltip) {
    const chartId = "bubble-chart";
    const dropdownId = "bubble-chart-dropdown";

    // Add dropdown to switch filter
    d3.select("#" + dropdownId)
      .on("change", function() {
        filters.categorical.selected = this.value;
        switchFilter(this.value);
      })
      .selectAll("option")
      .data(Object.keys(filters.categorical.values))
      .enter()
      .append("option")
      .attr("value", d => d)
      .text(d => attributes[d].display);

    const svg = d3
      .select("#" + chartId)
      .attr("width", "100%")
      .attr("height", "100%");

    const svgBox = svg.node().getBoundingClientRect();
    const margin = { top: 70, right: 20, bottom: 60, left: 20 };
    const width = svgBox.width - margin.left - margin.right;
    const height = svgBox.height - margin.top - margin.bottom;

    // Add chart title
    svg
      .append("text")
      .attr("class", "chart-title")
      .attr("x", margin.left + width / 2)
      .attr("y", margin.top + height + margin.bottom - 20)
      .attr("text-anchor", "middle")
      .text("Categorical Factors");

    const radius = 8; // Patient circle radius

    const simulation = d3
      .forceSimulation()
      .force(
        "x",
        d3
          .forceX()
          .strength(0.1)
          .x(width / 2)
      )
      .force("y", d3.forceY().strength(0.1))
      .force(
        "collision",
        d3
          .forceCollide()
          .radius(radius + 0.5)
          .iterations(4)
      )
      .on("tick", ticked);
    simulation.stop();

    const yScale = d3.scaleOrdinal();
    const yLabelScale = d3.scaleOrdinal();

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const optionLabels = g.append("g");

    const nodes = g.append("g");

    // Add circles
    const node = nodes
      .selectAll("circle")
      .data(data, d => d.id)
      .enter()
      .each(d => {
        d.x = width / 2;
        d.y = height / 2;
      })
      .append("circle")
      .attr("class", d => `patient-circle ${d.target.toLowerCase()}`)
      .attr("r", radius)
      .on("mouseover", d => {
        globalUpdate.highlight(d);
        tooltip.show(d);
      })
      .on("mouseout", d => {
        globalUpdate.unhighlight(d);
        tooltip.hide();
      })
      .on("mousemove", tooltip.move);

    simulation.nodes(data);

    function ticked() {
      node.attr("cx", d => d.x).attr("cy", d => d.y);
    }

    function switchFilter(filter) {
      // Update y scale according the square root of the number of patients in each filter option
      const options = Object.values(attributes[filter].values);
      const optionCount = options.map(option => {
        const count = data.filter(d => d[filter] === option).length;
        return {
          option: option,
          count: count,
          countSqrt: Math.sqrt(count)
        };
      });
      const countSqrtTotal = d3.sum(optionCount, d => d.countSqrt);
      optionCount.forEach(d => {
        d.countSqrtRatio = d.countSqrt / countSqrtTotal;
      });

      const yRange = [];
      const yLabelRange = [];
      for (let i = 0; i < optionCount.length; i++) {
        const current = optionCount[i];
        if (i === 0) {
          yLabelRange.push(0);
          yRange.push((current.countSqrtRatio * height) / 2);
        } else {
          const previous = optionCount[i - 1];
          const labelY = yLabelRange[i - 1] + previous.countSqrtRatio * height;
          yLabelRange.push(labelY);
          yRange.push(labelY + (current.countSqrtRatio * height) / 2);
        }
      }

      yScale.domain(options).range(yRange);
      yLabelScale.domain(options).range(yLabelRange);

      // Update filter option labels
      optionLabels.selectAll("*").remove();
      optionLabels
        .selectAll(".filter-option")
        .data(options)
        .enter()
        .append("text")
        .attr("class", "filter-option")
        .classed("selected", d => filters.categorical.values[filter][d])
        .attr("x", width / 2)
        .attr("y", d => yLabelScale(d))
        .attr("dy", "0.35em")
        .attr("text-anchor", "middle")
        .text(d => d)
        .on("click", d => {
          // Update filter
          const filterValue = filters.categorical.values[filter];
          filterValue[d] = !filterValue[d];
          globalUpdate.updateFilteredData(filters);
        });

      // Update the force
      simulation.force("y").y(d => yScale(d[filter]));
      simulation.alpha(0.8).restart();
    }

    switchFilter(filters.categorical.selected);

    const chart = {};
    chart.updateFilteredData = function(data) {
      optionLabels
        .selectAll(".filter-option")
        .classed(
          "selected",
          d => filters.categorical.values[filters.categorical.selected][d]
        );
      node.data(data, d => d.id).classed("filtered-out", d => d.filteredOut);
    };

    chart.highlight = function(d) {
      node.classed("filtered-out", true).classed("selected", e => e === d);
    };

    chart.unhighlight = function(d) {
      node
        .classed("filtered-out", d => d.filteredOut)
        .classed("selected", false);
    };
    return chart;
  }

  ////////////////////////////////////////////////////////////
  //// Parallel Coordinates //////////////////////////////////
  ////////////////////////////////////////////////////////////
  // https://beta.observablehq.com/@jerdak/parallel-coordinates-d3-v4
  // https://beta.observablehq.com/@mbostock/d3-parallel-coordinates
  function renderParallelCoordinates(data, globalUpdate) {
    const chartId = "parallel-coordinates";

    let brushDisabled = true; // During initialization, no brush

    const svg = d3
      .select("#" + chartId)
      .attr("width", "100%")
      .attr("height", "100%");

    const svgBox = svg.node().getBoundingClientRect();
    const margin = { top: 50, right: 20, bottom: 80, left: 20 };
    const width = svgBox.width - margin.left - margin.right;
    const height = svgBox.height - margin.top - margin.bottom;

    // Add chart title
    svg
      .append("text")
      .attr("class", "chart-title")
      .attr("x", margin.left + width / 2)
      .attr("y", margin.top + height + margin.bottom - 20)
      .attr("text-anchor", "middle")
      .text("Numerical Factors");

    const dimensions = Object.keys(attributes).filter(attr => {
      return attributes[attr].type === "numerical";
    });

    const xScale = {};
    dimensions.forEach(attr => {
      xScale[attr] = d3
        .scaleLinear()
        .domain(d3.extent(data, d => d[attr]))
        .range([0, width]);
    });
    const yScale = d3
      .scalePoint()
      .domain(dimensions)
      .range([0, height]);

    const line = d3.line();
    const axis = d3.axisBottom();

    // Returns the path for a given patient
    function pathGenerator(d) {
      return line(
        dimensions.map(attr => [xScale[attr](d[attr]), yScale(attr)])
      );
    }

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Add lines
    const backgroundPath = g
      .append("g")
      .selectAll("path")
      .data(data, d => d.id)
      .enter()
      .append("path")
      .attr("class", "patient-path filtered-out")
      .attr("d", pathGenerator);

    const foregroundPath = g
      .append("g")
      .selectAll("path")
      .data(data, d => d.id)
      .enter()
      .append("path")
      .attr("class", d => `patient-path ${d.target.toLowerCase()}`)
      .attr("d", pathGenerator)
      .on("mouseover", d => {
        globalUpdate.highlight(d);
        tooltip.show(d);
      })
      .on("mouseout", d => {
        globalUpdate.unhighlight(d);
        tooltip.hide();
      })
      .on("mousemove", tooltip.move);

    // Add a g element for each dimension
    const dimension = g
      .append("g")
      .selectAll(".dimension")
      .data(dimensions)
      .enter()
      .append("g")
      .attr("class", "dimension")
      .attr("transform", d => `translate(0,${yScale(d)})`);

    // Add axis and axis title
    dimension
      .append("g")
      .each(function(d) {
        d3.select(this).call(axis.scale(xScale[d]));
      })
      .append("text")
      .attr("class", "axis-title")
      .attr("text-anchor", "start")
      .attr("fill", "currentColor")
      .attr("y", -9)
      .text(d => attributes[d].display);

    // Add white text to make text readable
    dimension
      .selectAll("text")
      .clone(true)
      .lower()
      .attr("fill", "none")
      .attr("stroke-width", 5)
      .attr("stroke-linejoin", "round")
      .attr("stroke", "white");

    // Add brush for each axis
    dimension
      .append("g")
      .attr("class", "brush")
      .each(function(d) {
        d3.select(this)
          .call(
            (xScale[d].brush = d3
              .brushX()
              .extent([[0, -6], [width, 6]])
              .on("brush end", brush))
          )
          .call(xScale[d].brush.move, [0, width]);
      });

    brushDisabled = false;

    function brush(d) {
      if (brushDisabled) return;
      const s = d3.event.selection;
      if (!s) {
        d3.select(this).call(xScale[d].brush.move, [0, width]);
        return;
      }

      // Update filter
      const extent = s.map(xScale[d].invert);
      const filterValues = filters.numerical.values[d];
      filterValues.min = extent[0];
      filterValues.max = extent[1];
      globalUpdate.updateFilteredData(filters);
    }

    const chart = {};
    chart.updateFilteredData = function(data) {
      foregroundPath
        .data(data, d => d.id)
        .attr("stroke-opacity", d => (d.filteredOut ? 0 : 1));
    };

    chart.resetFilters = function() {
      // Make the filter selection rect to span the whole length without trigger brush event
      brushDisabled = true;
      dimension.select(".brush").each(function(d) {
        d3.select(this).call(xScale[d].brush.move, [0, width]);
      });
      brushDisabled = false;
    };

    chart.highlight = function(d) {
      foregroundPath
        .classed("selected", e => e === d)
        .attr("stroke-opacity", e => (e === d ? 1 : 0));
    };

    chart.unhighlight = function(d) {
      foregroundPath
        .classed("selected", false)
        .attr("stroke-opacity", d => (d.filteredOut ? 0 : 1));
    };
    return chart;
  }

  ////////////////////////////////////////////////////////////
  //// Donut Chart ///////////////////////////////////////////
  ////////////////////////////////////////////////////////////
  // http://www.cagrimmett.com/til/2016/08/19/d3-pie-chart.html
  // https://bl.ocks.org/adamjanes/5e53cfa2ef3d3f05828020315a3ba18c
  function renderDonutChart(data, globalUpdate) {
    const chartId = "donut-chart";

    const width = 200;
    const height = 200;

    const radius = Math.min(width, height) / 2;

    const svg = d3
      .select("#" + chartId)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // https://github.com/d3/d3-format
    const formatPercentage = d3.format(".0%");

    const pie = d3
      .pie()
      .value(d => d.value)
      .sort(null);

    const arc = d3
      .arc()
      .innerRadius(radius * 0.6)
      .outerRadius(radius);

    const labelArc = d3
      .arc()
      .innerRadius(radius * 0.8)
      .outerRadius(radius * 0.8);

    const chart = {};
    chart.updateFilteredData = function(data) {
      // Generate pie data
      // http://bl.ocks.org/phoebebright/raw/3176159/
      const pieData = d3
        .nest()
        .key(d => d.target)
        .rollup(leaves => leaves.length)
        .entries(data.filter(d => !d.filteredOut));

      const filteredTotal = d3.sum(pieData, d => d.value);

      const path = svg.selectAll("path").data(pie(pieData), d => d.data.key);

      // Update existing arcs
      path.attr("d", arc);

      // Enter new arcs
      path
        .enter()
        .append("path")
        .attr("class", d => `patient-slice ${d.data.key.toLowerCase()}`)
        .attr("d", arc);

      // Exit arcs
      path.exit().remove();

      const label = svg.selectAll("text").data(pie(pieData), d => d.data.key);

      // Update existing labels
      label
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .text(d => formatPercentage(d.value / filteredTotal));

      // Enter new labels
      label
        .enter()
        .append("text")
        .attr("class", "patient-slice-label")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .text(d => formatPercentage(d.value / filteredTotal));

      // Exit labels
      label.exit().remove();
    };

    // Initialize donut chart
    chart.updateFilteredData(data);

    return chart;
  }

  ////////////////////////////////////////////////////////////
  //// Count Summary /////////////////////////////////////////
  ////////////////////////////////////////////////////////////
  function renderCountSummary(data, globalUpdate) {
    const containerId = "count-summary";

    const target = d3
      .select("#" + containerId)
      .selectAll(".target")
      .data([
        { name: "Absence", class: "absence" },
        { name: "Filtered Out", class: "filtered-out" },
        { name: "Presence", class: "presence" }
      ])
      .enter()
      .append("div")
      .attr("class", "target");

    target.append("div").text(d => d.name);

    const patientCount = target
      .append("div")
      .attr("class", d => `patient-count ${d.class}`);

    const summary = {};
    summary.updateFilteredData = function(data) {
      // Count absence, presence and filtered out patients
      const countData = {};
      const filtered = data.filter(d => !d.filteredOut);
      countData.Absence = filtered.filter(d => d.target === "Absence").length;
      countData.Presence = filtered.length - countData.Absence;
      countData["Filtered Out"] = data.length - filtered.length;

      // Update the number
      patientCount.text(d => countData[d.name]);
    };
    // Initialize count summary
    summary.updateFilteredData(data);

    return summary;
  }

  ////////////////////////////////////////////////////////////
  //// Tooltip ///////////////////////////////////////////////
  ////////////////////////////////////////////////////////////
  function renderTooltip() {
    const tooltipContainer = d3.select("#tooltip");

    const tooltip = {};

    tooltip.show = function(d) {
      let content = "";
      Object.keys(attributes).forEach(attr => {
        content += `<div class="tooltip-entry-header">${
          attributes[attr].display
        }</div><div class="tooltip-entry-value">${d[attr]}</div>`;
      });
      tooltipContainer.html(content);
      tooltipContainer.transition().style("opacity", 1);

      // Get tooltip dimension
      tooltip.bbox = tooltipContainer.node().getBoundingClientRect();
    };

    tooltip.hide = function() {
      tooltipContainer.transition().style("opacity", 0);
    };

    tooltip.move = function() {
      const offset = 20;
      let left = d3.event.x + offset;
      let top = d3.event.y;
      // Make sure it doesn't go beyond the right of the screen
      if (left + tooltip.bbox.width > window.innerWidth) {
        left = d3.event.x - offset - tooltip.bbox.width;
      }
      // Make sure it doesn't go beyond the bottom of the screen
      if (top + tooltip.bbox.height > window.innerHeight) {
        top = window.innerHeight - tooltip.bbox.height;
      }
      tooltipContainer.style("left", left + "px").style("top", top + "px");
    };
    return tooltip;
  }
})();
