-- ----------------------------
-- Triggers structure for table ratings
-- ----------------------------
DROP TRIGGER IF EXISTS `insert_rating`*
CREATE TRIGGER `insert_rating` AFTER INSERT ON `ratings` FOR EACH ROW BEGIN
    IF NEW.problem_is_official = 1 THEN
        UPDATE official_problems
        SET rating_sum = rating_sum + NEW.rating_value,
            rating_num = rating_num + 1
        WHERE problem_id = NEW.problem_id;
    ELSE
        UPDATE workshop_problems
        SET rating_sum = rating_sum + NEW.rating_value,
            rating_num = rating_num + 1
        WHERE problem_id = NEW.problem_id;
    END IF;
END*

-- ----------------------------
-- Triggers structure for table ratings
-- ----------------------------
DROP TRIGGER IF EXISTS `update_rating`*
CREATE TRIGGER `update_rating` AFTER UPDATE ON `ratings` FOR EACH ROW BEGIN
    IF OLD.problem_is_official = 1 THEN
        UPDATE official_problems
        SET rating_sum = rating_sum - OLD.rating_value + NEW.rating_value
        WHERE problem_id = NEW.problem_id;
    ELSE
        UPDATE workshop_problems
        SET rating_sum = rating_sum - OLD.rating_value + NEW.rating_value
        WHERE problem_id = NEW.problem_id;
    END IF;
END*

-- ----------------------------
-- Triggers structure for table ratings
-- ----------------------------
DROP TRIGGER IF EXISTS `delete_rating`*
CREATE TRIGGER `delete_rating` AFTER DELETE ON `ratings` FOR EACH ROW BEGIN
    IF OLD.problem_is_official = 1 THEN
        UPDATE official_problems
        SET rating_sum = rating_sum - OLD.rating_value,
				    rating_num = rating_num - 1
        WHERE problem_id = OLD.problem_id;
    ELSE
        UPDATE workshop_problems
        SET rating_sum = rating_sum - OLD.rating_value,
				    rating_num = rating_num - 1
        WHERE problem_id = OLD.problem_id;
    END IF;
END*

-- ----------------------------
-- Triggers structure for table recommendations
-- ----------------------------
DROP TRIGGER IF EXISTS `insert_recommendation`*
CREATE TRIGGER `insert_recommendation` AFTER INSERT ON `recommendations` FOR EACH ROW BEGIN
    UPDATE workshop_problems
    SET problem_recommendation_number = problem_recommendation_number + 1
    WHERE problem_id = NEW.problem_id;
END*

-- ----------------------------
-- Triggers structure for table recommendations
-- ----------------------------
DROP TRIGGER IF EXISTS `delete_recommendation`*
CREATE TRIGGER `delete_recommendation` AFTER DELETE ON `recommendations` FOR EACH ROW BEGIN
    UPDATE workshop_problems
    SET problem_recommendation_number = problem_recommendation_number - 1
    WHERE problem_id = OLD.problem_id;
END*