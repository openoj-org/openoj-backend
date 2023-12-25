-- ----------------------------
-- Triggers structure for table ratings
-- ----------------------------
DROP TRIGGER IF EXISTS `insert_rating`
-- separator
CREATE TRIGGER `insert_rating` AFTER INSERT ON `ratings` FOR EACH ROW BEGIN
    IF NEW.problem_is_official = 1 THEN
        UPDATE official_problems
        SET problem_grade_sum = problem_grade_sum + NEW.rating_value,
            problem_grade_number = problem_grade_number + 1
        WHERE problem_id = NEW.problem_id;
    ELSE
        UPDATE workshop_problems
        SET problem_grade_sum = problem_grade_sum + NEW.rating_value,
            problem_grade_number = problem_grade_number + 1
        WHERE problem_id = NEW.problem_id;
    END IF;
END
-- separator

-- ----------------------------
-- Triggers structure for table ratings
-- ----------------------------
DROP TRIGGER IF EXISTS `update_rating`
-- separator
CREATE TRIGGER `update_rating` AFTER UPDATE ON `ratings` FOR EACH ROW BEGIN
    IF OLD.problem_is_official = 1 THEN
        UPDATE official_problems
        SET problem_grade_sum = problem_grade_sum - OLD.rating_value + NEW.rating_value
        WHERE problem_id = NEW.problem_id;
    ELSE
        UPDATE workshop_problems
        SET problem_grade_sum = problem_grade_sum - OLD.rating_value + NEW.rating_value
        WHERE problem_id = NEW.problem_id;
    END IF;
END
-- separator

-- ----------------------------
-- Triggers structure for table ratings
-- ----------------------------
DROP TRIGGER IF EXISTS `delete_rating`
-- separator
CREATE TRIGGER `delete_rating` AFTER DELETE ON `ratings` FOR EACH ROW BEGIN
    IF OLD.problem_is_official = 1 THEN
        UPDATE official_problems
        SET problem_grade_sum = problem_grade_sum - OLD.rating_value,
				    problem_grade_number = problem_grade_number - 1
        WHERE problem_id = OLD.problem_id;
    ELSE
        UPDATE workshop_problems
        SET problem_grade_sum = problem_grade_sum - OLD.rating_value,
				    problem_grade_number = problem_grade_number - 1
        WHERE problem_id = OLD.problem_id;
    END IF;
END
-- separator

-- ----------------------------
-- Triggers structure for table recommendations
-- ----------------------------
DROP TRIGGER IF EXISTS `insert_recommendation`
-- separator
CREATE TRIGGER `insert_recommendation` AFTER INSERT ON `recommendations` FOR EACH ROW BEGIN
    UPDATE workshop_problems
    SET problem_recommendation_number = problem_recommendation_number + 1
    WHERE problem_id = NEW.problem_id;
END
-- separator

-- ----------------------------
-- Triggers structure for table recommendations
-- ----------------------------
DROP TRIGGER IF EXISTS `delete_recommendation`
-- separator
CREATE TRIGGER `delete_recommendation` AFTER DELETE ON `recommendations` FOR EACH ROW BEGIN
    UPDATE workshop_problems
    SET problem_recommendation_number = problem_recommendation_number - 1
    WHERE problem_id = OLD.problem_id;
END
-- separator

-- ----------------------------
-- Triggers structure for table replies
-- ----------------------------
DROP TRIGGER IF EXISTS `insert_evaluation`
-- separator
CREATE TRIGGER `insert_evaluation` AFTER INSERT ON `evaluations` FOR EACH ROW BEGIN
    IF NEW.problem_is_official = 1 THEN
        IF NEW.evaluation_status = `AC` THEN
            UPDATE official_problems
            SET problem_submit_number = problem_submit_number + 1,
                problem_pass_number = problem_pass_number + 1
            WHERE problem_id = NEW.problem_id;
        ELSE
            UPDATE official_problems
            SET problem_submit_number = problem_submit_number + 1
            WHERE problem_id = NEW.problem_id;
        END IF;
    ELSE
        IF NEW.evaluation_status = `AC` THEN
            UPDATE workshop_problems
            SET problem_submit_number = problem_submit_number + 1,
                problem_pass_number = problem_pass_number + 1
            WHERE problem_id = NEW.problem_id;
        ELSE
            UPDATE workshop_problems
            SET problem_submit_number = problem_submit_number + 1
            WHERE problem_id = NEW.problem_id;
        END IF;
    END IF;
END
-- separator

-- ----------------------------
-- Triggers structure for table replies
-- ----------------------------
DROP TRIGGER IF EXISTS `insert_replies`
-- separator
CREATE TRIGGER `insert_replies` AFTER INSERT ON `replies` FOR EACH ROW BEGIN
    UPDATE posts
    SET last_reply_time = NEW.reply_time, reply_number = reply_number + 1
    WHERE post_id = NEW.post_id;
END
-- separator