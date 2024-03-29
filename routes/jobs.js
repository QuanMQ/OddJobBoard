const express = require("express");
const router = express.Router();
const { ensureAuth } = require("../middleware/auth");
const { Op } = require("sequelize");

const Job = require("../models/Job");
const User = require("../models/User");

// *@desc Process search form
// *@route GET /jobs/search
router.get("/search", ensureAuth, (req, res) => {
  const isAuthenticated = req.isAuthenticated();

  // *Extract values from non-empty input fields
  const searchTerms = [];
  Object.entries(req.query)
    .filter((term) => term[1] != "")
    .forEach((term) => {
      const terms = term[1].match(/\w+/g);
      terms.forEach((word) => {
        const termObj = {};
        termObj[term[0]] = { [Op.like]: "%" + word + "%" };
        searchTerms.push(termObj);
      });
    });

  Job.findAll({
    where: {
      [Op.or]: searchTerms,
      status: "Published",
    },
    include: User,
  })
    .then((jobsArr) => {
      const jobs = jobsArr.map((job) => job.dataValues);
      res.render("jobs/index", { jobs, req, isAuthenticated });
    })
    .catch((err) => {
      console.error(err);
      res.render("error/500", { isAuthenticated });
    });
});

// *@desc Show add page
// *@route GET /jobs/add
router.get("/add", ensureAuth, (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  res.render("jobs/add", { isAuthenticated });
});

// *@desc Process add form
// *@route POST /jobs
router.post("/", ensureAuth, async (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  let { title, reward, location, description, contact_email, contact_phone } =
    req.body;
  let errors = [];

  // *Validate Fields
  if (!title) {
    errors.push({ text: "Please add a title" });
  }
  if (!reward) {
    errors.push({ text: "Please add some reward" });
  }
  if (!location) {
    errors.push({ text: "Please add a location" });
  }
  if (!description) {
    errors.push({ text: "Please add a description" });
  }
  if (!contact_email) {
    errors.push({ text: "Please add a contact email" });
  }
  if (!contact_phone) {
    errors.push({ text: "Please add a contact phone" });
  }

  // *Check for errors;
  if (errors.length > 1) {
    res.render("jobs/add", {
      errors,
      title,
      reward,
      location,
      description,
      contact_email,
      contact_phone,
      isAuthenticated,
    });
  } else {
    try {
      req.body.userId = req.user.id;
      await Job.create(req.body);
      if (req.user.role == "Admin") {
        res.redirect("/access/ad");
      } else if (req.user.role == "Moderator") {
        res.redirect("/access/mod");
      } else {
        res.redirect("/dashboard");
      }
    } catch (err) {
      console.error(err);
      res.render("error/500", { isAuthenticated });
    }
  }
});

// *@desc Show single job
// *@route GET /jobs/:id
router.get("/:id", ensureAuth, async (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  try {
    const job = await Job.findByPk(req.params.id, { include: User });

    if (!job) {
      return res.render("error/404", { isAuthenticated });
    }
    res.render("jobs/show", { job: job.dataValues, req, isAuthenticated });
  } catch (err) {
    console.error(err);
    res.render("error/500", { isAuthenticated });
  }
});

// *@desc User job
// *@route GET /jobs/user/:userId
router.get("/user/:userId", ensureAuth, async (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  Job.findAll({
    where: {
      userId: req.params.userId,
      status: "Published",
    },
    include: User,
  })
    .then((jobsArr) => {
      const jobs = jobsArr.map((job) => job.dataValues);
      res.render("jobs/index", { jobs, req, isAuthenticated });
    })
    .catch((err) => {
      console.error(err);
      res.render("error/500", { isAuthenticated });
    });
});

// *@desc Show edit page
// *@route GET /jobs/edit/:id
router.get("/edit/:id", ensureAuth, async (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  try {
    const job = await Job.findByPk(req.params.id);

    if (!job) {
      return res.render("error/404", { isAuthenticated });
    }

    if (job.userId != req.user.id && req.user.role != "Admin") {
      res.redirect("/access/denied");
    } else {
      res.render("jobs/edit", { job: job.dataValues, isAuthenticated });
    }
  } catch (err) {
    console.error(err);
    return res.render("error/500", { isAuthenticated });
  }
});

// *@desc Update job
// *@route PUT /jobs/:id
router.put("/:id", ensureAuth, async (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  req.body.status = "Pending";
  try {
    let job = await Job.findByPk(req.params.id);

    if (!job) {
      return res.render("error/404", { isAuthenticated });
    }

    if (job.userId != req.user.id && req.user.role != "Admin") {
      res.redirect("/access/denied");
    } else {
      job = await Job.update(req.body, { where: { id: req.params.id } });
      if (req.user.role == "Admin") {
        res.redirect("/access/ad");
      } else if (req.user.role == "Moderator") {
        res.redirect("/access/mod");
      } else {
        res.redirect("/dashboard");
      }
    }
  } catch (err) {
    console.error(err);
    return res.render("error/500", { isAuthenticated });
  }
});

// *@desc Delete story
// *@route DELETE /jobs/:id
router.delete("/:id", ensureAuth, async (req, res) => {
  const isAuthenticated = req.isAuthenticated();
  try {
    let job = await Job.findByPk(req.params.id);

    if (!job) {
      return res.render("error/404", { isAuthenticated });
    }

    if (job.userId != req.user.id && req.user.role != "Admin") {
      res.redirect("/access/denied");
    } else {
      await Job.destroy({ where: { id: req.params.id } });
      res.redirect("/dashboard");
    }
  } catch (err) {
    console.error(err);
    return res.render("error/500", { isAuthenticated });
  }
});

module.exports = router;
